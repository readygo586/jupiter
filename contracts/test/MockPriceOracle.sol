pragma solidity ^0.5.16;

import "../PriceOracle.sol";
import "../VTokens/VBep20.sol";

contract SimplePriceOracle is PriceOracle {
    mapping(address => uint) internal prices;
    event PricePosted(
        address asset,
        uint previousPriceMantissa,
        uint requestedPriceMantissa,
        uint newPriceMantissa
    );

    function getUnderlyingPrice(address vToken) public view returns (uint) {
        if (compareStrings((VBep20(vToken)).symbol(), "vBNB")) {
            return 1e18;
        } else if (compareStrings(VBep20(vToken).symbol(), "VAI")) {
            return prices[address(vToken)];
        } else if (compareStrings(VBep20(vToken).symbol(), "vBTC")) {
            return prices[address(VBep20(vToken).underlying())] ; //* 1e10;
        } else {
            return prices[address(VBep20(vToken).underlying())];
        }
    }

    function setUnderlyingPrice(
        address vToken,
        uint underlyingPriceMantissa
    ) public {
        address asset = address(VBep20(vToken).underlying());
        emit PricePosted(
            asset,
            prices[asset],
            underlyingPriceMantissa,
            underlyingPriceMantissa
        );
        prices[asset] = underlyingPriceMantissa;
    }

    function setDirectPrice(address asset, uint price) public {
        emit PricePosted(asset, prices[asset], price, price);
        prices[asset] = price;
    }

    // v1 price oracle interface for use as backing of proxy
    function assetPrices(address asset) external view returns (uint) {
        return prices[asset];
    }

    function compareStrings(
        string memory a,
        string memory b
    ) internal pure returns (bool) {
        return (keccak256(abi.encodePacked((a))) ==
            keccak256(abi.encodePacked((b))));
    }
}
