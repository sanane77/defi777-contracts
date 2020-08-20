const { getContract, web3, group, getAccounts, str, getDefiAddresses, eth } = require('./test-lib');
const { singletons } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');

const FarmerToken = getContract('FarmerToken');
const FarmerTokenFactory = getContract('FarmerTokenFactory');
const TestERC20 = getContract('TestERC20');

group('Farmer Token', (accounts) => {
  const [user1, user2, user3, pool] = getAccounts(accounts);

  before(async () => {
    await singletons.ERC1820Registry(user1);
  });

  it('should allocate tokens correctly', async function() {
    this.timeout(10000);

    const factory = await FarmerTokenFactory.new();
    const token = await TestERC20.new();
    const reward1 = await TestERC20.new();

    await factory.createWrapper(token.address);
    const wrapperAddress = await factory.calculateWrapperAddress(token.address);
    const farmerToken = await FarmerToken.at(wrapperAddress);
    await farmerToken.addRewardToken(reward1.address);

    await token.approve(wrapperAddress, eth(10));
    await farmerToken.wrap(eth(2), { from: user1 });

    await reward1.transfer(farmerToken.address, eth(2));
    await farmerToken.harvest(reward1.address);
    expect(await str(farmerToken.rewardBalance(reward1.address, user1))).to.equal(eth('2'));

    await token.transfer(user2, eth(6), { from: user1 });
    await token.approve(wrapperAddress, eth(6), { from: user2 });
    await farmerToken.wrap(eth(6), { from: user2 });

    await reward1.transfer(farmerToken.address, eth(8));
    await farmerToken.harvest(reward1.address);
    expect(await str(farmerToken.rewardBalance(reward1.address, user1))).to.equal(eth('4'));
    expect(await str(farmerToken.rewardBalance(reward1.address, user2))).to.equal(eth('6'));

    await farmerToken.withdraw(reward1.address, eth(2), { from: user2 });
    expect(await str(farmerToken.rewardBalance(reward1.address, user1))).to.equal(eth('4'));
    expect(await str(farmerToken.rewardBalance(reward1.address, user2))).to.equal(eth('4'));

    await farmerToken.transfer(user3, eth('3'), { from: user2 });
    expect(await str(farmerToken.rewardBalance(reward1.address, user1))).to.equal(eth('4'));
    expect(await str(farmerToken.rewardBalance(reward1.address, user2))).to.equal(eth('2'));
    expect(await str(farmerToken.rewardBalance(reward1.address, user3))).to.equal(eth('2'));

    await reward1.transfer(farmerToken.address, eth(8));
    await farmerToken.harvest(reward1.address);
    await farmerToken.withdraw(reward1.address, eth(4), { from: user1 });
    expect(await str(farmerToken.rewardBalance(reward1.address, user1))).to.equal(eth('2'));
    expect(await str(farmerToken.rewardBalance(reward1.address, user2))).to.equal(eth('5'));
    expect(await str(farmerToken.rewardBalance(reward1.address, user3))).to.equal(eth('5'));

    await farmerToken.transfer(pool, eth('2'), { from: user1 });
    await farmerToken.transfer(pool, eth('3'), { from: user2 });
    await farmerToken.transfer(pool, eth('3'), { from: user3 });
    expect(await str(farmerToken.rewardBalance(reward1.address, user1))).to.equal('0');
    expect(await str(farmerToken.rewardBalance(reward1.address, user2))).to.equal('0');
    expect(await str(farmerToken.rewardBalance(reward1.address, user3))).to.equal('0');
    expect(await str(farmerToken.rewardBalance(reward1.address, pool))).to.equal(eth('12'));

    await reward1.transfer(farmerToken.address, eth(4));
    await farmerToken.harvest(reward1.address);

    expect(await str(farmerToken.rewardBalance(reward1.address, pool))).to.equal(eth('16'));

    await farmerToken.transfer(user1, eth('2'), { from: pool });
    await farmerToken.transfer(user2, eth('3'), { from: pool });
    await farmerToken.transfer(user3, eth('3'), { from: pool });
    expect(await str(farmerToken.rewardBalance(reward1.address, user1))).to.equal(eth('4'));
    expect(await str(farmerToken.rewardBalance(reward1.address, user2))).to.equal(eth('6'));
    expect(await str(farmerToken.rewardBalance(reward1.address, user3))).to.equal(eth('6'));
  });
});
