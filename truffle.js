module.exports = {
    networks: {
        development: {
            host: "127.0.0.1",
            port: 9545,
            network_id: "*" // Match any network id
        },
        ropsten:  {
            network_id: 3,
            host: "localhost",
            port:  8545,
            from: "0x539b30a99dae372c41145496f078F681549DBa4B",
            gas:   8600000
        },
        rinkeby: {
            host: "localhost", // Connect to geth on the specified
            port: 8545,
            from: "0x0085f8e72391Ce4BB5ce47541C846d059399fA6c", // default address to use for any transaction Truffle makes during migrations
            network_id: 4,
            gas: 4612388 // Gas limit used for deploys
        }
    },
    rpc: {
        host: "localhost",
        gas: 5000000,
        port: 8545
    },
    solc: {
        optimizer: {
            enabled: true,
            runs: 200
        }
    }
};
