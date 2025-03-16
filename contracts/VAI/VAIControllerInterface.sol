pragma solidity ^0.5.16;

import "../VTokens/VToken.sol";

contract VAIControllerInterface {
    function getVAIAddress() public view returns (address);
    function getMintableVAI(address minter) public view returns (uint, uint);
    function mintVAI(address minter, uint mintVAIAmount) public returns (uint);
    function repayVAI(address repayer, uint repayVAIAmount) public returns (uint);
    function liquidateVAI(address borrower, uint repayAmount, VTokenInterface vTokenCollateral) public returns (uint, uint);

    function _initializeVenusVAIState(uint blockNumber) external returns (uint);
    function updateVenusVAIMintIndex() external returns (uint);
    function calcDistributeVAIMinterVenus(address vaiMinter) external returns(uint, uint, uint, uint);

    function getVAIRepayAmount(address account) public view returns (uint);


    function mintSAI(address minter, uint mintSAIAmount) public returns (uint);
    function repaySAI(address repayer, uint repaySAIAmount) public returns (uint);
    function liquidateAAI(address borrower, uint repayAmount, VTokenInterface vTokenCollateral) public returns (uint, uint);
}
