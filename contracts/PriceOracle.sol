pragma solidity ^0.5.16;

contract PriceOracle {
    /// @notice Indicator that this is a PriceOracle contract (for inspection)
    bool public constant isPriceOracle = true;

    function getUnderlyingPrice(address vToken) external view returns (uint);
}
