pragma solidity ^0.5.16;


contract PriceOracle {
    /// @notice Indicator that this is a PriceOracle contract (for inspection)
    bool public constant isPriceOracle = true;

    function getUnderlyingPrice(address vToken) external view returns (uint);
}

contract UnderlyingTokenOracle {
    function getRoundData(uint80 _roundId) public view returns(uint80, int256, uint256, uint256, uint80);
    function latestRoundData() public view returns(uint80, int256, uint256, uint256, uint80);
}

contract Oracle is PriceOracle {

    // --- Auth ---
    mapping (address => uint) public wards;
    function rely(address guy) external auth { wards[guy] = 1; }
    function deny(address guy) external auth { wards[guy] = 0; }
    modifier auth {
        require(wards[msg.sender] == 1, "Not-authorized");
        _;
    }

    event UpdateFeeder(address indexed vToken, address oldFeeder, address newFeeder);
    mapping (address => address) public feeder;  //vToken -> underlyingToken oracle address

    constructor() public {
        wards[msg.sender] = 1;
    }

    //New or Update underlyingTokenOracle
    function updateFeeder(address vToken, address newFeeder) external auth {
        require(feeder[vToken] != newFeeder, "Same-feeder");
        address oldFeeder = feeder[vToken];
        feeder[vToken] = newFeeder;
        emit UpdateFeeder(vToken, oldFeeder, newFeeder);
    }

    function getUnderlyingPrice(address vToken) external view returns (uint) {
        require(feeder[vToken] != address(0), "No-feeder");
        (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound) = UnderlyingTokenOracle(feeder[vToken]).latestRoundData();

        require(answer > 0, "negative answer");
        return uint(answer);
    }
}
