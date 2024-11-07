
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const chai = require("chai");
const { constants } = require("ethers");
const { ethers } = require("hardhat");
const { deployComptroller } = require("../utils/deploy");


describe("Comptroller", () => {

    let Comptroller, Unitroller;

    before(async function () {
        const { comptroller, unitroller } = await deployComptroller();
        Comptroller = comptroller;
        Unitroller = unitroller;
    });
    it("fails if incentive is less than 1e18", async () => {

    });
})