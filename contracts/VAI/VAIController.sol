pragma solidity ^0.5.16;

import "../PriceOracle.sol";
import "../ErrorReporter.sol";
import "../Exponential.sol";
import "../ComptrollerStorage.sol";
import "../Comptroller.sol";
import "../VTokens/VToken.sol";
import "./VAIControllerStorage.sol";
import "./VAIUnitroller.sol";
import "./VAI.sol";

interface ComptrollerImplInterface {
    function protocolPaused() external view returns (bool);

    function mintedVAIs(address account) external view returns (uint);

    function vaiMintRate() external view returns (uint);

    function venusAccrued(address account) external view returns (uint);

    function getAssetsIn(
        address account
    ) external view returns (VToken[] memory);

    function oracle() external view returns (PriceOracle);
}

/**
 * @title Venus's VAI Comptroller Contract
 * @author Venus
 */
contract VAIController is
    VAIControllerStorageG2,
    VAIControllerErrorReporter,
    Exponential
{
    /// @notice Emitted when Comptroller is changed
    event NewComptroller(
        ComptrollerInterface oldComptroller,
        ComptrollerInterface newComptroller
    );

    /**
     * @notice Event emitted when VAI is minted
     */
    event MintVAI(address minter, uint mintVAIAmount);

    /**
     * @notice Event emitted when VAI is repaid
     */
    event RepayVAI(address payer, address borrower, uint repayVAIAmount);

    /// @notice The initial Venus index for a market
    uint224 public constant venusInitialIndex = 1e36;

    /**
     * @notice Event emitted when a borrow is liquidated
     */
    event LiquidateVAI(
        address liquidator,
        address borrower,
        uint repayAmount,
        address vTokenCollateral,
        uint seizeTokens
    );

    /**
     * @notice Emitted when treasury guardian is changed
     */
    event NewTreasuryGuardian(
        address oldTreasuryGuardian,
        address newTreasuryGuardian
    );

    /**
     * @notice Emitted when treasury address is changed
     */
    event NewTreasuryAddress(
        address oldTreasuryAddress,
        address newTreasuryAddress
    );

    /**
     * @notice Emitted when treasury percent is changed
     */
    event NewTreasuryPercent(uint oldTreasuryPercent, uint newTreasuryPercent);

    /**
     * @notice Event emitted when VAIs are minted and fee are transferred
     */
    event MintFee(address minter, uint feeAmount);

    /// @notice Emiitted when VAI base rate is changed
    event NewVAIBaseRate(
        uint256 oldBaseRateMantissa,
        uint256 newBaseRateMantissa
    );

    /// @notice Emiitted when VAI float rate is changed
    event NewVAIFloatRate(uint oldFloatRateMantissa, uint newFlatRateMantissa);

    /// @notice Emiitted when VAI receiver address is changed
    event NewVAIReceiver(address oldReceiver, address newReceiver);

    /// @notice Emiitted when VAI mint cap is changed
    event NewVAIMintCap(uint oldMintCap, uint newMintCap);

    /*** Main Actions ***/
    struct MintLocalVars {
        uint oErr;
        MathError mathErr;
        uint mintAmount;
        uint accountMintVAINew;
        uint accountMintableVAI;
    }

    function mintVAI(uint mintVAIAmount) external nonReentrant returns (uint) {
        if (address(comptroller) != address(0)) {
            require(mintVAIAmount > 0, "mintVAIAmount cannt be zero");
            require(
                !ComptrollerImplInterface(address(comptroller))
                    .protocolPaused(),
                "protocol is paused"
            );

            accrueVAIInterest();

            MintLocalVars memory vars;

            address minter = msg.sender;
            uint vaiTotalSupply = EIP20Interface(vai).totalSupply();
            uint vaiNewTotalSupply;

            (vars.mathErr, vaiNewTotalSupply) = addUInt(
                vaiTotalSupply,
                mintVAIAmount
            );
            require(vaiNewTotalSupply <= mintCap, "mint cap reached");

            if (vars.mathErr != MathError.NO_ERROR) {
                return
                    failOpaque(
                        Error.MATH_ERROR,
                        FailureInfo.MINT_FEE_CALCULATION_FAILED,
                        uint(vars.mathErr)
                    );
            }

            (vars.oErr, vars.accountMintableVAI) = getMintableVAI(minter);
            if (vars.oErr != uint(Error.NO_ERROR)) {
                return uint(Error.REJECTION);
            }

            // check that user have sufficient mintableVAI balance
            if (mintVAIAmount > vars.accountMintableVAI) {
                return fail(Error.REJECTION, FailureInfo.VAI_MINT_REJECTION);
            }

            // Calculate the minted balance based on interest index
            uint totalMintedVAI = ComptrollerImplInterface(address(comptroller))
                .mintedVAIs(minter);

            if (totalMintedVAI > 0) {
                uint256 repayAmount = getVAIRepayAmount(minter);
                uint remainedAmount;

                (vars.mathErr, remainedAmount) = subUInt(
                    repayAmount,
                    totalMintedVAI
                );
                if (vars.mathErr != MathError.NO_ERROR) {
                    return
                        failOpaque(
                            Error.MATH_ERROR,
                            FailureInfo.MINT_FEE_CALCULATION_FAILED,
                            uint(vars.mathErr)
                        );
                }

                (vars.mathErr, pastVAIInterest[minter]) = addUInt(
                    pastVAIInterest[minter],
                    remainedAmount
                );
                if (vars.mathErr != MathError.NO_ERROR) {
                    return
                        failOpaque(
                            Error.MATH_ERROR,
                            FailureInfo.MINT_FEE_CALCULATION_FAILED,
                            uint(vars.mathErr)
                        );
                }

                totalMintedVAI = repayAmount;
            }

            (vars.mathErr, vars.accountMintVAINew) = addUInt(
                totalMintedVAI,
                mintVAIAmount
            );
            require(
                vars.mathErr == MathError.NO_ERROR,
                "VAI_MINT_AMOUNT_CALCULATION_FAILED"
            );
            uint error = comptroller.setMintedVAIOf(
                minter,
                vars.accountMintVAINew
            );
            if (error != 0) {
                return error;
            }

            uint feeAmount;
            uint remainedAmount;
            vars.mintAmount = mintVAIAmount;
            if (treasuryPercent != 0) {
                (vars.mathErr, feeAmount) = mulUInt(
                    vars.mintAmount,
                    treasuryPercent
                );
                if (vars.mathErr != MathError.NO_ERROR) {
                    return
                        failOpaque(
                            Error.MATH_ERROR,
                            FailureInfo.MINT_FEE_CALCULATION_FAILED,
                            uint(vars.mathErr)
                        );
                }

                (vars.mathErr, feeAmount) = divUInt(feeAmount, 1e18);
                if (vars.mathErr != MathError.NO_ERROR) {
                    return
                        failOpaque(
                            Error.MATH_ERROR,
                            FailureInfo.MINT_FEE_CALCULATION_FAILED,
                            uint(vars.mathErr)
                        );
                }

                (vars.mathErr, remainedAmount) = subUInt(
                    vars.mintAmount,
                    feeAmount
                );
                if (vars.mathErr != MathError.NO_ERROR) {
                    return
                        failOpaque(
                            Error.MATH_ERROR,
                            FailureInfo.MINT_FEE_CALCULATION_FAILED,
                            uint(vars.mathErr)
                        );
                }

                VAI(vai).mint(treasuryAddress, feeAmount);

                emit MintFee(minter, feeAmount);
            } else {
                remainedAmount = vars.mintAmount;
            }

            VAI(vai).mint(minter, remainedAmount);
            vaiMinterInterestIndex[minter] = vaiMintIndex;

            emit MintVAI(minter, remainedAmount);

            return uint(Error.NO_ERROR);
        }
    }

    /**
     * @notice Repay VAI
     */
    function repayVAI(
        uint repayVAIAmount
    ) external nonReentrant returns (uint, uint) {
        if (address(comptroller) != address(0)) {
            accrueVAIInterest();

            require(repayVAIAmount > 0, "repayVAIAmount cannt be zero");

            require(
                !ComptrollerImplInterface(address(comptroller))
                    .protocolPaused(),
                "protocol is paused"
            );

            address payer = msg.sender;

            return repayVAIFresh(msg.sender, msg.sender, repayVAIAmount);
        }
    }

    /**
     * @notice Repay VAI Internal
     * @notice Borrowed VAIs are repaid by another user (possibly the borrower).
     * @param payer the account paying off the VAI
     * @param borrower the account with the debt being payed off
     * @param repayAmount the amount of VAI being returned
     * @return (uint, uint) An error code (0=success, otherwise a failure, see ErrorReporter.sol), and the actual repayment amount.
     */
    function repayVAIFresh(
        address payer,
        address borrower,
        uint repayAmount
    ) internal returns (uint, uint) {
        MathError mErr;

        (
            uint burn,
            uint partOfCurrentInterest,
            uint partOfPastInterest
        ) = getVAICalculateRepayAmount(borrower, repayAmount);

        VAI(vai).burn(payer, burn);
        bool success = VAI(vai).transferFrom(
            payer,
            receiver,
            partOfCurrentInterest
        );
        require(success == true, "failed to transfer VAI fee");

        uint vaiBalanceBorrower = ComptrollerImplInterface(address(comptroller))
            .mintedVAIs(borrower);
        uint accountVAINew;

        (mErr, accountVAINew) = subUInt(vaiBalanceBorrower, burn);
        require(
            mErr == MathError.NO_ERROR,
            "VAI_BURN_AMOUNT_CALCULATION_FAILED"
        );

        (mErr, accountVAINew) = subUInt(accountVAINew, partOfPastInterest);
        require(
            mErr == MathError.NO_ERROR,
            "VAI_BURN_AMOUNT_CALCULATION_FAILED"
        );

        (mErr, pastVAIInterest[borrower]) = subUInt(
            pastVAIInterest[borrower],
            partOfPastInterest
        );
        require(
            mErr == MathError.NO_ERROR,
            "VAI_BURN_AMOUNT_CALCULATION_FAILED"
        );

        uint error = comptroller.setMintedVAIOf(borrower, accountVAINew);
        if (error != 0) {
            return (error, 0);
        }
        emit RepayVAI(payer, borrower, burn);

        return (uint(Error.NO_ERROR), burn);
    }

    /**
     * @notice The sender liquidates the vai minters collateral.
     *  The collateral seized is transferred to the liquidator.
     * @param borrower The borrower of vai to be liquidated
     * @param vTokenCollateral The market in which to seize collateral from the borrower
     * @param repayAmount The amount of the underlying borrowed asset to repay
     * @return (uint, uint) An error code (0=success, otherwise a failure, see ErrorReporter.sol), and the actual repayment amount.
     */
    function liquidateVAI(
        address borrower,
        uint repayAmount,
        VTokenInterface vTokenCollateral
    ) external nonReentrant returns (uint, uint) {
        require(
            !ComptrollerImplInterface(address(comptroller)).protocolPaused(),
            "protocol is paused"
        );

        uint error = vTokenCollateral.accrueInterest();
        if (error != uint(Error.NO_ERROR)) {
            // accrueInterest emits logs on errors, but we still want to log the fact that an attempted liquidation failed
            return (
                fail(
                    Error(error),
                    FailureInfo.VAI_LIQUIDATE_ACCRUE_COLLATERAL_INTEREST_FAILED
                ),
                0
            );
        }

        // liquidateVAIFresh emits borrow-specific logs on errors, so we don't need to
        return
            liquidateVAIFresh(
                msg.sender,
                borrower,
                repayAmount,
                vTokenCollateral
            );
    }

    /**
     * @notice The liquidator liquidates the borrowers collateral by repay borrowers VAI.
     *  The collateral seized is transferred to the liquidator.
     * @param liquidator The address repaying the VAI and seizing collateral
     * @param borrower The borrower of this VAI to be liquidated
     * @param vTokenCollateral The market in which to seize collateral from the borrower
     * @param repayAmount The amount of the VAI to repay
     * @return (uint, uint) An error code (0=success, otherwise a failure, see ErrorReporter.sol), and the actual repayment VAI.
     */
    function liquidateVAIFresh(
        address liquidator,
        address borrower,
        uint repayAmount,
        VTokenInterface vTokenCollateral
    ) internal returns (uint, uint) {
        if (address(comptroller) != address(0)) {
            accrueVAIInterest();

            /* Fail if liquidate not allowed */
            uint allowed = comptroller.liquidateBorrowAllowed(
                address(this),
                address(vTokenCollateral),
                liquidator,
                borrower,
                repayAmount
            );
            if (allowed != 0) {
                return (
                    failOpaque(
                        Error.REJECTION,
                        FailureInfo.VAI_LIQUIDATE_COMPTROLLER_REJECTION,
                        allowed
                    ),
                    0
                );
            }

            /* Verify vTokenCollateral market's block number equals current block number */
            //if (vTokenCollateral.accrualBlockNumber() != accrualBlockNumber) {
            if (vTokenCollateral.accrualBlockNumber() != getBlockNumber()) {
                return (
                    fail(
                        Error.REJECTION,
                        FailureInfo.VAI_LIQUIDATE_COLLATERAL_FRESHNESS_CHECK
                    ),
                    0
                );
            }

            /* Fail if borrower = liquidator */
            if (borrower == liquidator) {
                return (
                    fail(
                        Error.REJECTION,
                        FailureInfo.VAI_LIQUIDATE_LIQUIDATOR_IS_BORROWER
                    ),
                    0
                );
            }

            /* Fail if repayAmount = 0 */
            if (repayAmount == 0) {
                return (
                    fail(
                        Error.REJECTION,
                        FailureInfo.VAI_LIQUIDATE_CLOSE_AMOUNT_IS_ZERO
                    ),
                    0
                );
            }

            /* Fail if repayAmount = -1 */
            if (repayAmount == uint(-1)) {
                return (
                    fail(
                        Error.REJECTION,
                        FailureInfo.VAI_LIQUIDATE_CLOSE_AMOUNT_IS_UINT_MAX
                    ),
                    0
                );
            }

            /* Fail if repayVAI fails */
            (uint repayBorrowError, uint actualRepayAmount) = repayVAIFresh(
                liquidator,
                borrower,
                repayAmount
            );
            if (repayBorrowError != uint(Error.NO_ERROR)) {
                return (
                    fail(
                        Error(repayBorrowError),
                        FailureInfo.VAI_LIQUIDATE_REPAY_BORROW_FRESH_FAILED
                    ),
                    0
                );
            }

            /////////////////////////
            // EFFECTS & INTERACTIONS
            // (No safe failures beyond this point)

            /* We calculate the number of collateral tokens that will be seized */
            (uint amountSeizeError, uint seizeTokens) = comptroller
                .liquidateVAICalculateSeizeTokens(
                    address(vTokenCollateral),
                    actualRepayAmount
                );
            require(
                amountSeizeError == uint(Error.NO_ERROR),
                "VAI_LIQUIDATE_COMPTROLLER_CALCULATE_AMOUNT_SEIZE_FAILED"
            );

            /* Revert if borrower collateral token balance < seizeTokens */
            require(
                vTokenCollateral.balanceOf(borrower) >= seizeTokens,
                "VAI_LIQUIDATE_SEIZE_TOO_MUCH"
            );

            uint seizeError;
            seizeError = vTokenCollateral.seize(
                liquidator,
                borrower,
                seizeTokens
            );

            /* Revert if seize tokens fails (since we cannot be sure of side effects) */
            require(seizeError == uint(Error.NO_ERROR), "token seizure failed");

            /* We emit a LiquidateBorrow event */
            emit LiquidateVAI(
                liquidator,
                borrower,
                actualRepayAmount,
                address(vTokenCollateral),
                seizeTokens
            );

            /* We call the defense hook */
            comptroller.liquidateBorrowVerify(
                address(this),
                address(vTokenCollateral),
                liquidator,
                borrower,
                actualRepayAmount,
                seizeTokens
            );

            return (uint(Error.NO_ERROR), actualRepayAmount);
        }
    }

    /*** Admin Functions ***/

    /**
     * @notice Sets a new comptroller
     * @dev Admin function to set a new comptroller
     * @return uint 0=success, otherwise a failure (see ErrorReporter.sol for details)
     */
    function _setComptroller(
        ComptrollerInterface comptroller_
    ) external returns (uint) {
        // Check caller is admin
        if (msg.sender != admin) {
            return
                fail(
                    Error.UNAUTHORIZED,
                    FailureInfo.SET_COMPTROLLER_OWNER_CHECK
                );
        }

        ComptrollerInterface oldComptroller = comptroller;
        comptroller = comptroller_;
        emit NewComptroller(oldComptroller, comptroller_);

        return uint(Error.NO_ERROR);
    }

    function _become(VAIUnitroller unitroller) external {
        require(
            msg.sender == unitroller.admin(),
            "only unitroller admin can change brains"
        );
        require(
            unitroller._acceptImplementation() == 0,
            "change not authorized"
        );
    }

    /**
     * @dev Local vars for avoiding stack-depth limits in calculating account total supply balance.
     *  Note that `vTokenBalance` is the number of vTokens the account owns in the market,
     *  whereas `borrowBalance` is the amount of underlying that the account has borrowed.
     */
    struct AccountAmountLocalVars {
        uint oErr;
        MathError mErr;
        uint sumSupply;
        uint marketSupply;
        uint sumBorrowPlusEffects;
        uint vTokenBalance;
        uint borrowBalance;
        uint exchangeRateMantissa;
        uint oraclePriceMantissa;
        Exp exchangeRate;
        Exp oraclePrice;
        Exp tokensToDenom;
    }

    function getMintableVAI(address minter) public view returns (uint, uint) {
        PriceOracle oracle = ComptrollerImplInterface(address(comptroller))
            .oracle();
        VToken[] memory enteredMarkets = ComptrollerImplInterface(
            address(comptroller)
        ).getAssetsIn(minter);

        AccountAmountLocalVars memory vars; // Holds all our calculation results

        uint accountMintableVAI;
        uint i;

        /**
         * We use this formula to calculate mintable VAI amount.
         * totalSupplyAmount * VAIMintRate - (totalBorrowAmount + mintedVAIOf)
         */
        for (i = 0; i < enteredMarkets.length; i++) {
            (
                vars.oErr,
                vars.vTokenBalance,
                vars.borrowBalance,
                vars.exchangeRateMantissa
            ) = enteredMarkets[i].getAccountSnapshot(minter);
            if (vars.oErr != 0) {
                // semi-opaque error code, we assume NO_ERROR == 0 is invariant between upgrades
                return (uint(Error.SNAPSHOT_ERROR), 0);
            }
            vars.exchangeRate = Exp({mantissa: vars.exchangeRateMantissa});

            // Get the normalized price of the asset
            vars.oraclePriceMantissa = oracle.getUnderlyingPrice(
                address(enteredMarkets[i])
            );
            if (vars.oraclePriceMantissa == 0) {
                return (uint(Error.PRICE_ERROR), 0);
            }
            vars.oraclePrice = Exp({mantissa: vars.oraclePriceMantissa});

            (vars.mErr, vars.tokensToDenom) = mulExp(
                vars.exchangeRate,
                vars.oraclePrice
            );
            if (vars.mErr != MathError.NO_ERROR) {
                return (uint(Error.MATH_ERROR), 0);
            }

            // marketSupply = tokensToDenom * vTokenBalance
            (vars.mErr, vars.marketSupply) = mulScalarTruncate(
                vars.tokensToDenom,
                vars.vTokenBalance
            );
            if (vars.mErr != MathError.NO_ERROR) {
                return (uint(Error.MATH_ERROR), 0);
            }

            (, uint collateralFactorMantissa, ) = Comptroller(
                address(comptroller)
            ).markets(address(enteredMarkets[i]));
            (vars.mErr, vars.marketSupply) = mulUInt(
                vars.marketSupply,
                collateralFactorMantissa
            );
            if (vars.mErr != MathError.NO_ERROR) {
                return (uint(Error.MATH_ERROR), 0);
            }

            (vars.mErr, vars.marketSupply) = divUInt(vars.marketSupply, 1e18);
            if (vars.mErr != MathError.NO_ERROR) {
                return (uint(Error.MATH_ERROR), 0);
            }

            (vars.mErr, vars.sumSupply) = addUInt(
                vars.sumSupply,
                vars.marketSupply
            );
            if (vars.mErr != MathError.NO_ERROR) {
                return (uint(Error.MATH_ERROR), 0);
            }

            // sumBorrowPlusEffects += oraclePrice * borrowBalance
            (vars.mErr, vars.sumBorrowPlusEffects) = mulScalarTruncateAddUInt(
                vars.oraclePrice,
                vars.borrowBalance,
                vars.sumBorrowPlusEffects
            );
            if (vars.mErr != MathError.NO_ERROR) {
                return (uint(Error.MATH_ERROR), 0);
            }
        }

        (vars.mErr, vars.sumBorrowPlusEffects) = addUInt(
            vars.sumBorrowPlusEffects,
            ComptrollerImplInterface(address(comptroller)).mintedVAIs(minter)
        );
        if (vars.mErr != MathError.NO_ERROR) {
            return (uint(Error.MATH_ERROR), 0);
        }

        (vars.mErr, accountMintableVAI) = mulUInt(
            vars.sumSupply,
            ComptrollerImplInterface(address(comptroller)).vaiMintRate()
        );
        require(
            vars.mErr == MathError.NO_ERROR,
            "VAI_MINT_AMOUNT_CALCULATION_FAILED"
        );

        (vars.mErr, accountMintableVAI) = divUInt(accountMintableVAI, 10000);
        require(
            vars.mErr == MathError.NO_ERROR,
            "VAI_MINT_AMOUNT_CALCULATION_FAILED"
        );

        (vars.mErr, accountMintableVAI) = subUInt(
            accountMintableVAI,
            vars.sumBorrowPlusEffects
        );
        if (vars.mErr != MathError.NO_ERROR) {
            return (uint(Error.REJECTION), 0);
        }

        return (uint(Error.NO_ERROR), accountMintableVAI);
    }

    function _setTreasuryData(
        address newTreasuryGuardian,
        address newTreasuryAddress,
        uint newTreasuryPercent
    ) external returns (uint) {
        // Check caller is admin
        if (!(msg.sender == admin || msg.sender == treasuryGuardian)) {
            return
                fail(Error.UNAUTHORIZED, FailureInfo.SET_TREASURY_OWNER_CHECK);
        }

        require(newTreasuryPercent < 1e18, "treasury percent cap overflow");

        address oldTreasuryGuardian = treasuryGuardian;
        address oldTreasuryAddress = treasuryAddress;
        uint oldTreasuryPercent = treasuryPercent;

        treasuryGuardian = newTreasuryGuardian;
        treasuryAddress = newTreasuryAddress;
        treasuryPercent = newTreasuryPercent;

        emit NewTreasuryGuardian(oldTreasuryGuardian, newTreasuryGuardian);
        emit NewTreasuryAddress(oldTreasuryAddress, newTreasuryAddress);
        emit NewTreasuryPercent(oldTreasuryPercent, newTreasuryPercent);

        return uint(Error.NO_ERROR);
    }

    function getVAIRepayRate() public view returns (uint) {
        PriceOracle oracle = ComptrollerImplInterface(address(comptroller))
            .oracle();
        MathError mErr;

        if (baseRateMantissa > 0) {
            if (floatRateMantissa > 0) {
                uint oraclePrice = oracle.getUnderlyingPrice((vai));
                if (1e18 >= oraclePrice) {
                    uint delta;
                    uint rate;

                    (mErr, delta) = subUInt(1e18, oraclePrice);
                    require(
                        mErr == MathError.NO_ERROR,
                        "VAI_REPAY_RATE_CALCULATION_FAILED"
                    );

                    (mErr, delta) = mulUInt(delta, floatRateMantissa);
                    require(
                        mErr == MathError.NO_ERROR,
                        "VAI_REPAY_RATE_CALCULATION_FAILED"
                    );

                    (mErr, delta) = divUInt(delta, 1e18);
                    require(
                        mErr == MathError.NO_ERROR,
                        "VAI_REPAY_RATE_CALCULATION_FAILED"
                    );

                    (mErr, rate) = addUInt(delta, baseRateMantissa);
                    require(
                        mErr == MathError.NO_ERROR,
                        "VAI_REPAY_RATE_CALCULATION_FAILED"
                    );

                    return rate;
                } else {
                    return baseRateMantissa;
                }
            } else {
                return baseRateMantissa;
            }
        } else {
            return 0;
        }
    }

    function getVAIRepayRatePerBlock() public view returns (uint) {
        uint yearlyRate = getVAIRepayRate();

        MathError mErr;
        uint rate;

        (mErr, rate) = divUInt(yearlyRate, getBlocksPerYear());
        require(
            mErr == MathError.NO_ERROR,
            "VAI_REPAY_RATE_CALCULATION_FAILED"
        );

        return rate;
    }

    function getVAIMinterInterestIndex(
        address minter
    ) public view returns (uint256) {
        uint256 storedIndex = vaiMinterInterestIndex[minter];
        // If the user minted VAI before the stability fee was introduced, accrue
        // starting from stability fee launch
        if (storedIndex == 0) {
            return 1e8;
        }
        return storedIndex;
    }

    /**
     * @notice Get the current total VAI a user needs to repay
     * @param account The address of the VAI borrower
     * @return (uint) The total amount of VAI the user needs to repay
     */
    function getVAIRepayAmount(address account) public view returns (uint) {
        MathError mErr;
        uint delta;

        uint amount = ComptrollerImplInterface(address(comptroller)).mintedVAIs(
            account
        );

        (mErr, delta) = mulUInt(vaiMintIndex, 1e18);
        require(
            mErr == MathError.NO_ERROR,
            "VAI_TOTAL_REPAY_AMOUNT_CALCULATION_FAILED"
        );

        (mErr, delta) = divUInt(delta, getVAIMinterInterestIndex(account));
        require(
            mErr == MathError.NO_ERROR,
            "VAI_TOTAL_REPAY_AMOUNT_CALCULATION_FAILED"
        );

        (mErr, amount) = mulUInt(amount, delta);
        require(
            mErr == MathError.NO_ERROR,
            "VAI_TOTAL_REPAY_AMOUNT_CALCULATION_FAILED"
        );

        (mErr, amount) = divUInt(amount, 1e18);
        require(
            mErr == MathError.NO_ERROR,
            "VAI_TOTAL_REPAY_AMOUNT_CALCULATION_FAILED"
        );

        return amount;
    }

    /**
     * @notice Calculate how much VAI the user needs to repay
     * @param borrower The address of the VAI borrower
     * @param repayAmount The amount of VAI being returned
     * @return (uint, uint, uint) Amount of VAI to be burned, amount of VAI the user needs to pay in current interest and amount of VAI the user needs to pay in past interest
     */
    function getVAICalculateRepayAmount(
        address borrower,
        uint256 repayAmount
    ) public view returns (uint, uint, uint) {
        MathError mErr;
        uint256 totalRepayAmount = getVAIRepayAmount(borrower);
        uint currentInterest;

        (mErr, currentInterest) = subUInt(
            totalRepayAmount,
            ComptrollerImplInterface(address(comptroller)).mintedVAIs(borrower)
        );
        require(
            mErr == MathError.NO_ERROR,
            "VAI_BURN_AMOUNT_CALCULATION_FAILED"
        );

        (mErr, currentInterest) = addUInt(
            pastVAIInterest[borrower],
            currentInterest
        );
        require(
            mErr == MathError.NO_ERROR,
            "VAI_BURN_AMOUNT_CALCULATION_FAILED"
        );

        uint burn;
        uint partOfCurrentInterest = currentInterest;
        uint partOfPastInterest = pastVAIInterest[borrower];

        if (repayAmount >= totalRepayAmount) {
            (mErr, burn) = subUInt(totalRepayAmount, currentInterest);
            require(
                mErr == MathError.NO_ERROR,
                "VAI_BURN_AMOUNT_CALCULATION_FAILED"
            );
        } else {
            uint delta;

            (mErr, delta) = mulUInt(repayAmount, 1e18);
            require(mErr == MathError.NO_ERROR, "VAI_PART_CALCULATION_FAILED");

            (mErr, delta) = divUInt(delta, totalRepayAmount);
            require(mErr == MathError.NO_ERROR, "VAI_PART_CALCULATION_FAILED");

            uint totalMintedAmount;
            (mErr, totalMintedAmount) = subUInt(
                totalRepayAmount,
                currentInterest
            );
            require(
                mErr == MathError.NO_ERROR,
                "VAI_MINTED_AMOUNT_CALCULATION_FAILED"
            );

            (mErr, burn) = mulUInt(totalMintedAmount, delta);
            require(
                mErr == MathError.NO_ERROR,
                "VAI_BURN_AMOUNT_CALCULATION_FAILED"
            );

            (mErr, burn) = divUInt(burn, 1e18);
            require(
                mErr == MathError.NO_ERROR,
                "VAI_BURN_AMOUNT_CALCULATION_FAILED"
            );

            (mErr, partOfCurrentInterest) = mulUInt(currentInterest, delta);
            require(
                mErr == MathError.NO_ERROR,
                "VAI_CURRENT_INTEREST_AMOUNT_CALCULATION_FAILED"
            );

            (mErr, partOfCurrentInterest) = divUInt(
                partOfCurrentInterest,
                1e18
            );
            require(
                mErr == MathError.NO_ERROR,
                "VAI_CURRENT_INTEREST_AMOUNT_CALCULATION_FAILED"
            );

            (mErr, partOfPastInterest) = mulUInt(
                pastVAIInterest[borrower],
                delta
            );
            require(
                mErr == MathError.NO_ERROR,
                "VAI_PAST_INTEREST_CALCULATION_FAILED"
            );

            (mErr, partOfPastInterest) = divUInt(partOfPastInterest, 1e18);
            require(
                mErr == MathError.NO_ERROR,
                "VAI_PAST_INTEREST_CALCULATION_FAILED"
            );
        }

        return (burn, partOfCurrentInterest, partOfPastInterest);
    }

    function accrueVAIInterest() public {
        MathError mErr;
        uint delta;

        (mErr, delta) = mulUInt(vaiMintIndex, getVAIRepayRatePerBlock());
        require(mErr == MathError.NO_ERROR, "VAI_INTEREST_ACCURE_FAILED");

        (mErr, delta) = divUInt(delta, 1e18);
        require(mErr == MathError.NO_ERROR, "VAI_INTEREST_ACCURE_FAILED");

        (mErr, delta) = mulUInt(delta, getBlockNumber() - accrualBlockNumber);
        require(mErr == MathError.NO_ERROR, "VAI_INTEREST_ACCURE_FAILED");

        (mErr, delta) = addUInt(delta, vaiMintIndex);
        require(mErr == MathError.NO_ERROR, "VAI_INTEREST_ACCURE_FAILED");

        vaiMintIndex = delta;
        accrualBlockNumber = getBlockNumber();
    }

    /**
     * @notice Set VAI borrow base rate
     * @param newBaseRateMantissa the base rate multiplied by 10**18
     */
    function setBaseRate(uint newBaseRateMantissa) external {
        // Check caller is admin
        require(msg.sender == admin, "UNAUTHORIZED");

        uint old = baseRateMantissa;
        baseRateMantissa = newBaseRateMantissa;
        emit NewVAIBaseRate(old, baseRateMantissa);
    }

    /**
     * @notice Set VAI borrow float rate
     * @param newFloatRateMantissa the VAI float rate multiplied by 10**18
     */
    function setFloatRate(uint newFloatRateMantissa) external {
        // Check caller is admin
        require(msg.sender == admin, "UNAUTHORIZED");

        uint old = floatRateMantissa;
        floatRateMantissa = newFloatRateMantissa;
        emit NewVAIFloatRate(old, floatRateMantissa);
    }

    /**
     * @notice Set VAI stability fee receiver address
     * @param newReceiver the address of the VAI fee receiver
     */
    function setReceiver(address newReceiver) external {
        // Check caller is admin
        require(msg.sender == admin, "UNAUTHORIZED");
        require(newReceiver != address(0), "invalid receiver address");

        address old = receiver;
        receiver = newReceiver;
        emit NewVAIReceiver(old, newReceiver);
    }

    /**
     * @notice Set VAI mint cap
     * @param _mintCap the amount of VAI that can be minted
     */
    function setMintCap(uint _mintCap) external {
        // Check caller is admin
        require(msg.sender == admin, "UNAUTHORIZED");

        uint old = mintCap;
        mintCap = _mintCap;
        emit NewVAIMintCap(old, _mintCap);
    }

    function getBlockNumber() public view returns (uint) {
        return block.number;
    }

    function getBlocksPerYear() public pure returns (uint) {
        return 10512000; //(24 * 60 * 60 * 365) / 3;
    }

    /**
     * @notice Return the address of the VAI token
     * @return The address of VAI
     */
    function getVAIAddress() public view returns (address) {
        return vai;
    }

    function initialize() public onlyAdmin {
        // Bug fixed.
        vaiMintIndex = 1e18;
        accrualBlockNumber = getBlockNumber();
        mintCap = uint(-1);

        // The counter starts true to prevent changing it from zero to non-zero (i.e. smaller cost/refund)
        _notEntered = true;
    }

    /**
     * @notice Set the VAI token contract address
     * @param vai_ The new address of the VAI token contract
     */
    function setVAIAddress(address vai_) external onlyAdmin {
        vai = vai_;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "only admin can");
        _;
    }

    constructor() public {
        admin = msg.sender;
    }

    /*** Reentrancy Guard ***/

    /**
     * @dev Prevents a contract from calling itself, directly or indirectly.
     */
    modifier nonReentrant() {
        require(_notEntered, "re-entered");
        _notEntered = false;
        _;
        _notEntered = true; // get a gas-refund post-Istanbul
    }
}
