
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MockPriceFeed {

    // 声明结构体来存储每个轮次的数据
    struct RoundData {
        uint80 roundId;
        int256 answer;
        uint256 startedAt;
        uint256 updatedAt;
        uint80 answeredInRound;
    }

    // 存储最新的轮次数据
    RoundData private latestData;

    // 声明事件 PriceUpdated
    event PriceUpdated(
        uint80 indexed roundId,
        int256 answer,
        uint256 timestamp
    );

    // 获取最新的轮次数据（latestRoundData）
    function latestRoundData() public view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    ) {
        return (
        latestData.roundId,
        latestData.answer,
        latestData.startedAt,
        latestData.updatedAt,
        latestData.answeredInRound
        );
    }

    // 更新价格的函数（updatePrice）
    function updatePrice(int256 price) public {
        // 增加新的轮次数据（这里模拟生成新的轮次ID和时间）
        uint80 newRoundId = latestData.roundId + 1;
        uint256 currentTime = block.timestamp;

        // 更新轮次数据
        latestData = RoundData({
        roundId: newRoundId,
        answer: price,
        startedAt: currentTime,
        updatedAt: currentTime,
        answeredInRound: newRoundId
        });

        // 触发 PriceUpdated 事件
        emit PriceUpdated(newRoundId, price, currentTime);
    }
}
