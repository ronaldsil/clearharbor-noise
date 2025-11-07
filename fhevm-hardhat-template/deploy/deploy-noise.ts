import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployed = await deploy("NoiseMonitor", {
    from: deployer,
    args: [],
    log: true,
    skipIfAlreadyDeployed: false,
  });

  console.log(`NoiseMonitor contract deployed at: ${deployed.address}`);
  console.log(`Network: ${hre.network.name}`);
};

export default func;
func.id = "deploy_noise_monitor";
func.tags = ["NoiseMonitor"];

