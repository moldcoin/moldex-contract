pragma solidity ^0.4.24;
import "./SafeMath.sol";

/*

このコントラクトについて
1. ERC1155 Token Standardを利用
2. ERC1155 Tokenのデポジット
3. ERC1155 Tokenの交換
4. ERC1155 Tokenの引き出し
5. ERC1155 Tokenの交換にかかるFeeをもらう(Admin)
6. Contract Ownerの変更
7. Contract Admin User の追加

*/

contract Token {
    function approve(address _spender, uint256[] _ids, uint256[] _currentValues, uint256[] _values) external returns(bool);
    function balanceOf(uint256 _id, address _owner) external view returns (uint256);
    function allowance(uint256 _id, address _owner, address _spender) external view returns (uint256);
    function transferFrom(address _from, address _to, uint256[] _ids, uint256[] _values) external returns (bool);
    function transfer(address _to, uint256[] _ids, uint256[] _values) external returns (bool);
    function name(uint256 _id) external view returns (string);
    function symbol(uint256 _id) external view returns (string);
    function uri(uint256 _id) external view returns (string);
    function totalSupply(uint256 _typeId) external view returns (uint256);
}

contract Moldex {
    using SafeMath for uint256;

    //コントラクトowner
    address public owner;
    // tradeのfeeを受け取るアカウント
    address public feeAccount;
    //1155 tokenの登録 contract address -> type_id -> user address -> deposit balance
    mapping(address => mapping(uint256 => mapping(address => uint256))) public ERC1155Tokens;
    // contract admins
    mapping (address => bool) public admins;
    // userが最後にtransactionを発行した block number
    mapping (address => uint256) public lastActiveTransaction;
    // orderのうち完了された分の値を記録
    mapping (bytes32 => uint256) public orderFills;
    // contract の ownerがtokenやbalanceを引き出せる間隔を制限する
    uint256 public inactivityReleasePeriod;
    // trade 済みのorderを登録
    mapping (bytes32 => bool) public traded;
    // withdraws hash -> bool
    mapping (bytes32 => bool) public withdrawn;

    // set owner event
    event SetOwner(address indexed previousOwner, address indexed newOwner);
    event Deposit(address tokenAddress,uint256 tokenId, address user, uint256 amount, uint256 balance);
    event Withdraw(address tokenAddress,uint256 tokenId, address user, uint256 amount);


    // Owner Validation
    modifier onlyOwner {
        assert(msg.sender == owner);
        _;
    }

    // Admin Validation
    modifier onlyAdmin {
        if (msg.sender != owner && !admins[msg.sender]) revert();
        _;
    }

    constructor
    (
        address _feeAccount
    )
    public
    {
        owner = msg.sender;
        admins[msg.sender] = true;
        feeAccount = _feeAccount;
        inactivityReleasePeriod = 0;
    }


		//set initialize func to use proxy contract
		//see detail in https://blog.zeppelinos.org/proxy-patterns/
	 bool internal _initialized;

   function initialize(address _owner, address _feeAccount) public {
      require(!_initialized);
        owner = _owner;
        admins[_owner] = true;
        feeAccount = _feeAccount;
        inactivityReleasePeriod = 0;
      _initialized = true;
   }

    // Set Owner function
    function setOwner
    (
        address _newOwner
    )
    external onlyOwner
    {
        emit SetOwner(owner, _newOwner);
        owner = _newOwner;
    }

    // set admin
    function setAdmin
    (
        address admin,
        bool isAdmin
    )
    external onlyOwner
    {
        admins[admin] = isAdmin;
    }

    /*
    @param expiry duration to withdraw fees for admin users
    */
    function setInactivityReleasePeriod
    (
        uint256 expiry
    )
    external onlyAdmin returns
    (bool success)
    {
        if (expiry > 1000000) revert();
        inactivityReleasePeriod = expiry;
        return true;
    }

    function deposit
    (
        address[] _tokenAddresses,
        uint256[] _tokenIds,
        uint256[] _amounts
    )
    external
    {
        for(uint256 i = 0; i < _tokenIds.length; i++) {
            uint256[] memory tokenIds = new uint256[](1);
            uint256[] memory amounts = new uint256[](1);
            tokenIds[0] = _tokenIds[i];
            amounts[0] = _amounts[i];
            if (!Token(_tokenAddresses[i]).transferFrom(msg.sender, address(this), tokenIds, amounts)) revert();
            ERC1155Tokens[_tokenAddresses[i]][_tokenIds[i]][msg.sender] = ERC1155Tokens[_tokenAddresses[i]][_tokenIds[i]][msg.sender].add(_amounts[i]);
            lastActiveTransaction[msg.sender] = block.number;
            emit Deposit(_tokenAddresses[i], _tokenIds[i], msg.sender, _amounts[i], ERC1155Tokens[_tokenAddresses[i]][_tokenIds[i]][msg.sender]);
        }
    }

    function depositETH()
    public payable
    {
        ERC1155Tokens[address(0)][0][msg.sender] = ERC1155Tokens[address(0)][0][msg.sender].add(msg.value);
        lastActiveTransaction[msg.sender] = block.number;
        emit Deposit(address(0), 0, msg.sender, msg.value, ERC1155Tokens[address(0)][0][msg.sender]);
    }

    // 自分で引き出す場合. 手数料はかからない
    function withdraw
    (
        address[] _tokenAddresses,
        uint256[] _tokenIds,
        uint256[] _amounts
    )
    external returns (bool)
    {
        if (block.number.sub(lastActiveTransaction[msg.sender]) < inactivityReleasePeriod) revert();
        for(uint256 i=0; i<_tokenIds.length; i++) {
            if (ERC1155Tokens[_tokenAddresses[i]][_tokenIds[i]][msg.sender] < _amounts[i]) revert();
            ERC1155Tokens[_tokenAddresses[i]][_tokenIds[i]][msg.sender] = ERC1155Tokens[_tokenAddresses[i]][_tokenIds[i]][msg.sender].sub(_amounts[i]);
            if (_tokenAddresses[i] == address(0)) {
                if (!msg.sender.send(_amounts[i])) revert();
            } else {
                uint256[] memory tokenIds = new uint256[](1);
                uint256[] memory amounts = new uint256[](1);
                tokenIds[0] = _tokenIds[i];
                amounts[0] = _amounts[i];
                if (!Token(_tokenAddresses[i]).transfer(msg.sender, tokenIds, amounts)) revert();
            }
            emit Withdraw(_tokenAddresses[i], _tokenIds[i], msg.sender, _amounts[i]);
        }
        return true;
    }

    // owner じゃなくて　admin経由で引き出すとき
    function adminWithdrawERC1155
    (
        address[2] addresses,
        uint256[4] tradeValues,
        uint8 v,
        bytes32 r,
        bytes32 s
    )
    external onlyAdmin returns (bool)
    {
        /*
        addresses[0] contract_address
        addresses[1] user_address

        tradeValues[0] _tokenId
        tradeValues[1] _amount
        tradeValues[2] feeWithdrawal
        tradeValues[3] nonce
        */
        // generate hash
        address token_contract_address = addresses[0];
        address user_address = addresses[1];
        uint256 tokenId = tradeValues[0];
        uint256 amount = tradeValues[1];
        uint256 fee = tradeValues[2];
        uint256 nonce = tradeValues[3];
        bytes32 hash = keccak256(abi.encodePacked(address(this), token_contract_address, tokenId, amount, user_address, nonce));
        // check withdrawn
        require(!withdrawn[hash]);
        withdrawn[hash] = true;
        // 署名データの確認
        require(ecrecover(keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash)), v, r, s) == user_address);
        // max を 5%に設定
        if (fee > 50 finney) fee = 50 finney;
        // デポジット量から引く
        ERC1155Tokens[token_contract_address][tokenId][user_address] = ERC1155Tokens[token_contract_address][tokenId][user_address].sub(amount);
        // (手数料 / 1 ether)(%) * amount = 手数料 * amount / 1 ether
        ERC1155Tokens[token_contract_address][tokenId][feeAccount] = ERC1155Tokens[token_contract_address][tokenId][feeAccount].add(fee.mul(amount) / 1 ether);
        // ( (1 ether - 手数料) / 1 ether ) * amount = ((1 ether - 手数料) * amount) / 1 ether
        amount = (1 ether - fee).mul(amount) / 1 ether;
        if (token_contract_address == address(0)) {
            if (!user_address.send(amount)) revert();
        } else {
            uint256[] memory tokenIds = new uint256[](1);
            uint256[] memory values = new uint256[](1);
            tokenIds[0] = tokenId;
            values[0] = amount;
            if (!Token(token_contract_address).transfer(user_address, tokenIds, values)) revert();
        }
        lastActiveTransaction[user_address] = block.number;
        emit Withdraw(token_contract_address, tokenId, user_address, amount);
        return true;
    }

    function trade
    (
        uint256[10] tradeValues,
        address[4] tradeAddresses,

        uint8[2] v,
        bytes32[4] rs
    )
    external onlyAdmin
    returns (bool)
    {
        /*
        tradeValues[0] buyAmount
        tradeValues[1] sellAmount     amountBuyとamountSellは amountBuy / amountSellでレートを表す
        tradeValues[2] expires
        tradeValues[3] order nonce
        tradeValues[4] amount // これは このトレードで交換されるBuyTokenの実際の量
        tradeValues[5] trade nonce
        tradeValues[6] feeMake
        tradeValues[7] feeTake
        tradeValues[8] buy token の Id
        tradeValues[9] sell token の Id
        */

        /*
        tradeAddresses[0] tokenBuy
        tradeAddresses[1] tokenSell
        tradeAddresses[2] maker
        tradeAddresses[3] taker
        */

        /*
        rs[0] maker r
        rs[1] maker s
        rs[2] taker r
        rs[3] taker s
        */
        // orderHashは、誰が、どのトークンいくつをどのトークン幾つに交換したいのかを指定
        bytes32 orderHash = keccak256(abi.encodePacked(
        address(this), // dex address
        tradeAddresses[0], // buy token address
        tradeValues[8], // buy token Id
        tradeValues[0], // buy amount
        tradeAddresses[1], //  sell token address
        tradeValues[9], // sell token Id
        tradeValues[1], // sell amount
        tradeValues[2], // expiry date
        tradeValues[3], // order nonce
        tradeAddresses[2] // maker address
        ));
        // check maker signature is valid
        require(ecrecover(keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", orderHash)), v[0], rs[0], rs[1]) == tradeAddresses[2]);
        bytes32 tradeHash = keccak256(abi.encodePacked(orderHash, tradeValues[4], tradeAddresses[3], tradeValues[5]));
        // check trader signature is valid
        require(ecrecover(keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", tradeHash)), v[1], rs[2], rs[3]) == tradeAddresses[3]);
        // check traded
        require(!traded[tradeHash]);
        traded[tradeHash] = true;
        //check feeMake, feeTake are valid. Maximum 10%
        require(tradeValues[6] <= 100 finney);
        require(tradeValues[7] <= 100 finney);
        // orderFills の合計が買い注文の値をうわまっていないことを確認
        require(orderFills[orderHash].add(tradeValues[4]) <= tradeValues[0]);
        // 売る側が必要なトークンの量を持っているか確認(buy tokenの量を確認)
        require(ERC1155Tokens[tradeAddresses[0]][tradeValues[8]][tradeAddresses[3]] >= tradeValues[4]);
        // makerが持ってる売りたいトークンの量が                                        amountSell * amount / amountBuy
        require(ERC1155Tokens[tradeAddresses[1]][tradeValues[9]][tradeAddresses[2]] >= tradeValues[1].mul(tradeValues[4]) / tradeValues[0]);

        // 以下トークンの交換 buyTokenを売り手から引く
        ERC1155Tokens[tradeAddresses[0]][tradeValues[8]][tradeAddresses[3]] = ERC1155Tokens[tradeAddresses[0]][tradeValues[8]][tradeAddresses[3]].sub(tradeValues[4]);
        // buyTokenをmakerに加える. 手数料を引いた分
        ERC1155Tokens[tradeAddresses[0]][tradeValues[8]][tradeAddresses[2]] = ERC1155Tokens[tradeAddresses[0]][tradeValues[8]][tradeAddresses[2]].add(tradeValues[4].mul((1 ether) - tradeValues[6]) / (1 ether));
        // 手数料を支払う
        ERC1155Tokens[tradeAddresses[0]][tradeValues[8]][feeAccount] = ERC1155Tokens[tradeAddresses[0]][tradeValues[8]][feeAccount].add(tradeValues[4].mul(tradeValues[6]) / (1 ether));
        // sellTokenをmakerから引く
        ERC1155Tokens[tradeAddresses[1]][tradeValues[9]][tradeAddresses[2]] = ERC1155Tokens[tradeAddresses[1]][tradeValues[9]][tradeAddresses[2]].sub(tradeValues[1].mul(tradeValues[4]) / tradeValues[0]);
        // sellTokenをtakerに足す
        ERC1155Tokens[tradeAddresses[1]][tradeValues[9]][tradeAddresses[3]] = ERC1155Tokens[tradeAddresses[1]][tradeValues[9]][tradeAddresses[3]].add(tradeValues[1].mul((1 ether) - tradeValues[7]).mul(tradeValues[4]) / tradeValues[0] / (1 ether));
        // sellTokenをfeeAccountに加える. 手数料
        ERC1155Tokens[tradeAddresses[1]][tradeValues[9]][feeAccount] = ERC1155Tokens[tradeAddresses[1]][tradeValues[9]][feeAccount].add(tradeValues[1].mul(tradeValues[7]).mul(tradeValues[4]) / tradeValues[0] / (1 ether));
        // add amount to orderFills
        orderFills[orderHash] = orderFills[orderHash].add(tradeValues[4]);

        lastActiveTransaction[tradeAddresses[2]] = block.number;
        lastActiveTransaction[tradeAddresses[3]] = block.number;
        return true;
    }


    function() public payable {
        ERC1155Tokens[address(0)][0][msg.sender] = ERC1155Tokens[address(0)][0][msg.sender].add(msg.value);
        lastActiveTransaction[msg.sender] = block.number;
        emit Deposit(address(0), 0, msg.sender, msg.value, ERC1155Tokens[address(0)][0][msg.sender]);
    }
}
