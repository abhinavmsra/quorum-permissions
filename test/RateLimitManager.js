const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

const deployContract = async (contractName, args = []) => {
  const deployedContract = await ethers.deployContract(contractName, args);
  await deployedContract.waitForDeployment();
  return deployedContract;
};

describe("RateLimitManager", function () {
  async function deployRateLimitManagerFixture(
    threshold = 100,
    window = 60 * 60,
  ) {
    const [owner] = await ethers.getSigners();
    const orgId = "HAVEN1";
    const permUpgradable = await deployContract("PermissionsUpgradable", [
      owner.address,
    ]);
    const orgManager = await deployContract("OrgManager", [
      permUpgradable.target,
    ]);
    const roleManager = await deployContract("RoleManager", [
      permUpgradable.target,
    ]);
    const accountManager = await deployContract("AccountManager", [
      permUpgradable.target,
    ]);
    const voterManager = await deployContract("VoterManager", [
      permUpgradable.target,
    ]);
    const nodeManager = await deployContract("NodeManager", [
      permUpgradable.target,
    ]);
    const rateLimitManager = await deployContract("RateLimitManager", [
      orgId,
      permUpgradable.target,
      threshold,
      window,
    ]);
    const permissionsInterface = await deployContract("PermissionsInterface", [
      permUpgradable.target,
    ]);
    const permissionsImplementation = await deployContract(
      "PermissionsImplementation",
      [
        permUpgradable.target,
        orgManager.target,
        roleManager.target,
        accountManager.target,
        voterManager.target,
        nodeManager.target,
        rateLimitManager.target,
      ],
    );
    
    await permUpgradable.init(
      permissionsInterface.target,
      permissionsImplementation.target,
    );
    
    await permissionsInterface.setPolicy(orgId, "ADMIN", "ORGADMIN");
    await permissionsInterface.init(3, 4);
    assignAdminRole
    
    await permissionsInterface.updateNetworkBootStatus();

    return {
      permUpgradable,
      rateLimitManager,
      owner,
      threshold,
      window,
      orgId,
    };
  }

  describe("Deployment", function () {
    it("should set thresholds & upgradeable contract", async function () {
      const { permUpgradable, rateLimitManager, threshold, window, orgId } =
        await loadFixture(deployRateLimitManagerFixture);

      const _orgId = await rateLimitManager.orgId();
      const _permUpgradable = await rateLimitManager.permUpgradable();
      const _threshold = await rateLimitManager.threshold();
      const _window = await rateLimitManager.window();

      expect(_orgId).to.equal(orgId);
      expect(_permUpgradable).to.equal(permUpgradable.target);
      expect(_threshold).to.equal(threshold);
      expect(_window).to.equal(window);
    });

    it("should not allow to set window to 0", async function () {
      const [owner] = await ethers.getSigners();

      await expect(
        ethers.deployContract("RateLimitManager", [
          "HAVEN1",
          owner.address,
          100,
          0,
        ]),
      ).to.be.revertedWith("window cannot be zero");
    });
  });

  describe("updateLimits", function () {
    it("should revert when called by a non-admin", async function () {
      const [_, addr1] = await ethers.getSigners();
      const { rateLimitManager } = await loadFixture(
        deployRateLimitManagerFixture,
      );

      await expect(
        rateLimitManager.connect(addr1).updateLimits(1, 1)
      ).to.be.revertedWith("account is not a org admin account");
    });
    
    it("should revert when window is set to zero", async function () {
      const [owner] = await ethers.getSigners();
      const { rateLimitManager } = await loadFixture(deployRateLimitManagerFixture);

      await expect(
        rateLimitManager.connect(owner).updateLimits(1, 0)
      ).to.be.revertedWith("window cannot be zero");
    });
  });

  // describe("Deployment", function () {
  //   it("Should set the right unlockTime", async function () {
  //     const { lock, unlockTime } = await loadFixture(deployOneYearLockFixture);

  //     expect(await lock.unlockTime()).to.equal(unlockTime);
  //   });

  //   it("Should set the right owner", async function () {
  //     const { lock, owner } = await loadFixture(deployOneYearLockFixture);

  //     expect(await lock.owner()).to.equal(owner.address);
  //   });

  //   it("Should receive and store the funds to lock", async function () {
  //     const { lock, lockedAmount } = await loadFixture(
  //       deployOneYearLockFixture
  //     );

  //     expect(await ethers.provider.getBalance(lock.target)).to.equal(
  //       lockedAmount
  //     );
  //   });

  //   it("Should fail if the unlockTime is not in the future", async function () {
  //     // We don't use the fixture here because we want a different deployment
  //     const latestTime = await time.latest();
  //     const Lock = await ethers.getContractFactory("Lock");
  //     await expect(Lock.deploy(latestTime, { value: 1 })).to.be.revertedWith(
  //       "Unlock time should be in the future"
  //     );
  //   });
  // });

  // describe("Withdrawals", function () {
  //   describe("Validations", function () {
  //     it("Should revert with the right error if called too soon", async function () {
  //       const { lock } = await loadFixture(deployOneYearLockFixture);

  //       await expect(lock.withdraw()).to.be.revertedWith(
  //         "You can't withdraw yet"
  //       );
  //     });

  //     it("Should revert with the right error if called from another account", async function () {
  //       const { lock, unlockTime, otherAccount } = await loadFixture(
  //         deployOneYearLockFixture
  //       );

  //       // We can increase the time in Hardhat Network
  //       await time.increaseTo(unlockTime);

  //       // We use lock.connect() to send a transaction from another account
  //       await expect(lock.connect(otherAccount).withdraw()).to.be.revertedWith(
  //         "You aren't the owner"
  //       );
  //     });

  //     it("Shouldn't fail if the unlockTime has arrived and the owner calls it", async function () {
  //       const { lock, unlockTime } = await loadFixture(
  //         deployOneYearLockFixture
  //       );

  //       // Transactions are sent using the first signer by default
  //       await time.increaseTo(unlockTime);

  //       await expect(lock.withdraw()).not.to.be.reverted;
  //     });
  //   });

  //   describe("Events", function () {
  //     it("Should emit an event on withdrawals", async function () {
  //       const { lock, unlockTime, lockedAmount } = await loadFixture(
  //         deployOneYearLockFixture
  //       );

  //       await time.increaseTo(unlockTime);

  //       await expect(lock.withdraw())
  //         .to.emit(lock, "Withdrawal")
  //         .withArgs(lockedAmount, anyValue); // We accept any value as `when` arg
  //     });
  //   });

  //   describe("Transfers", function () {
  //     it("Should transfer the funds to the owner", async function () {
  //       const { lock, unlockTime, lockedAmount, owner } = await loadFixture(
  //         deployOneYearLockFixture
  //       );

  //       await time.increaseTo(unlockTime);

  //       await expect(lock.withdraw()).to.changeEtherBalances(
  //         [owner, lock],
  //         [lockedAmount, -lockedAmount]
  //       );
  //     });
  //   });
  // });
});
