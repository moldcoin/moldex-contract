pragma solidity ^0.4.24;

library SafeMath {

    function mul
    (
        uint256 a,
        uint256 b
    )
    internal pure
    returns (uint256 c)
    {
        if (a == 0) {
            return 0;
        }
        c = a * b;
        require(c / a == b, "should be commutative");
        return c;
    }

    function div
    (
        uint256 a,
        uint256 b
    )
    internal pure returns (uint256)
    {
        require(b > 0,"should be more than 0");
        uint256 c = a / b;
        return c;
    }

    function sub
    (
        uint256 a,
        uint256 b
    )
    internal pure
    returns (uint256)
    {
        require(b <= a, "a should be more or equal to a.");
        uint256 c = a - b;
        return c;
    }

    function add
    (
        uint256 a,
        uint256 b
    )
    internal pure
    returns (uint256)
    {
        uint256 c = a + b;
        require(c >= a, "c should be more or equal to a");
        return c;
    }

    function mod
    (
        uint256 a,
        uint256 b
    )
    internal pure
    returns (uint256)
    {
        require(b != 0,"b should not be zero");
        return a % b;
    }
}

library Address {
    /*
    @param account address of the account to check
    @return whether the target address is a contract
    */

    function isContract(address account)
    internal view
    returns (bool)
    {
        uint256 size;
        // 指定したaddressの code size が0なら EOA, codeが存在してたらcontract
        assembly { size := extcodesize(account) }
        return size > 0;
    }
}


interface IERC1155 {
    event Approval(address indexed _owner, address indexed _spender, uint256 indexed _id, uint256 _oldValue, uint256 _value);
    event Transfer(address _spender, address indexed _from, address _to, uint256 indexed _id, uint256 _value);

    function transfer (address _to, uint256[] _ids, uint256[] _values) external returns (bool);
    function approve(address _spender, uint256[] _ids, uint256[] _currentValues, uint256[] _values) external returns(bool);
    function balanceOf(uint256 _id, address _owner) external view returns (uint256);
    function allowance(uint256 _id, address _owner, address _spender) external view returns (uint256);
    function transferFrom(address _from, address _to, uint256[] _ids, uint256[] _values) external returns (bool);
}

/*
ERC1155 Token Contract
*/

contract Ownable {
    address private _owner;

    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    /**
     * @dev The Ownable constructor sets the original `owner` of the contract to the sender
     * account.
     */
    constructor() public {
        _owner = msg.sender;
        emit OwnershipTransferred(address(0), _owner);
    }

    /**
     * @return the address of the owner.
     */
    function owner() public view returns(address) {
        return _owner;
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        require(isOwner());
        _;
    }

    /**
     * @return true if `msg.sender` is the owner of the contract.
     */
    function isOwner() public view returns(bool) {
        return msg.sender == _owner;
    }

    /**
     * @dev Allows the current owner to relinquish control of the contract.
     * @notice Renouncing to ownership will leave the contract without an owner.
     * It will not be possible to call the functions with the `onlyOwner`
     * modifier anymore.
     */
    function renounceOwnership() public onlyOwner {
        emit OwnershipTransferred(_owner, address(0));
        _owner = address(0);
    }

    /**
     * @dev Allows the current owner to transfer control of the contract to a newOwner.
     * @param newOwner The address to transfer ownership to.
     */
    function transferOwnership(address newOwner) public onlyOwner {
        _transferOwnership(newOwner);
    }

    /**
     * @dev Transfers control of the contract to a newOwner.
     * @param newOwner The address to transfer ownership to.
     */
    function _transferOwnership(address newOwner) internal {
        require(newOwner != address(0));
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }
}

contract ERC1155 is IERC1155 {
    using SafeMath for uint256;
    using Address for address;

    // Variables
    struct Items {
        string name;
        uint256 totalSupply;
        mapping (address => uint256) balances;
        bool isNFT;
    }
    mapping (uint256 => uint8) public decimals;
    mapping (uint256 => string) public symbols;
    mapping (uint256 => mapping(address => mapping(address => uint256))) public allowances; // tokenId => token owner => spender => token
    mapping (uint256 => Items) public items;
    mapping (uint256 => string) public metadataURIs;

    bytes4 constant private ERC1155_RECEIVED = 0xf23a6e61;

    // Events
    event Approval(address indexed _owner, address indexed _spender, uint indexed _id, uint256 _oldValue, uint256 _value);
    event Transfer(address _spender, address indexed _from, address indexed _to, uint256 indexed _id, uint256 _value);
    event Mint(uint256 _tokenId, string _name, uint256 _totalSupply, string _uri, uint256 _decimals, string _symbol, bool _isNFI);

    function allowance
    (
        uint256 _id,
        address _owner,
        address _spender
    )
    external view
    returns (uint256)
    {
        return allowances[_id][_owner][_spender];
    }

}


contract ERC1155NonFungible is ERC1155 {
    uint256 constant TYPE_MASK = uint256(uint128(~0)) << 128; //上の128bit を全て1に 11..1100..00
    uint256 constant NF_INDEX_MASK = uint128(~0); // 128bit 11...111
    uint256 constant TYPE_NF_BIT = 1 << 255; // 100...00 256bit

    mapping(uint256 => address) nfiOwners;

    function isNonFungible
    (
        uint256 _id
    )
    public pure
    returns(bool)
    {
        // top level bit = 1 であることをNonFungible
        return (_id & TYPE_NF_BIT) == TYPE_NF_BIT;
    }

    function isFungible
    (
        uint256 _id
    )
    public pure
    returns (bool)
    {
        // top level bit == 0 はFungible
        return _id & TYPE_NF_BIT == 0;
    }

    function getNonFungibleIndex
    (
        uint256 _id
    )
    public pure
    returns (uint256)
    {
        // return bottom level 128 bit
        return _id & NF_INDEX_MASK;
    }

    function getNonFungibleBaseType
    (
        uint256 _id
    )
    public pure
    returns (uint256)
    {

        return _id & TYPE_MASK; //base id を返す前半の128bit
    }

    function isNonFungibleBaseType
    (
        uint256 _id
    )
    public pure
    returns (bool)
    {
        // NonFungible Tokenのbase idを示す値であることを確認
        return (_id & TYPE_NF_BIT == TYPE_NF_BIT) && (_id & NF_INDEX_MASK == 0);
    }

    function isNonFungibleItem
    (
        uint256 _id
    )
    public pure
    returns (bool)
    {
        // NFTokenのindexを指していることを確認
        return (_id & TYPE_NF_BIT == TYPE_NF_BIT) && (_id & NF_INDEX_MASK != 0);
    }

    function ownerOf
    (
        uint256 _id
    ) public view
    returns (address)
    {
        if(isNonFungible(_id)){
            return nfiOwners[_id];
        } else {
            // if not NFT
            return address(0);
        }
    }

    function nonFungibleByIndex
    (
        uint256 _nfiType,
        uint128 _index
    )
    external view
    returns (uint256)
    {
        require(isNonFungibleBaseType(_nfiType),"should be non fungible type");
        require(uint256(_index) <= items[_nfiType].totalSupply, "should be lower or equal to ");

        uint256 nfiId = _nfiType | uint256(_index);

        return nfiId;
    }

    //========== overrides =======


    function approve
    (
        address _spender,
        uint256[] _ids,
        uint256[] _currentValues,
        uint256[] _values
    )
    external returns (bool)
    {
        uint256 _id;
        uint256 _value;

        for (uint256 i = 0; i < _ids.length; ++i) {
            _id = _ids[i];
            _value = _values[i];

            if (isNonFungible(_id)) {
                // non-fungibleの場合
                require(_value == 1 || _value == 0,"value shold be ");
                require(nfiOwners[_id] == msg.sender, "should be token owner.");
                require(allowances[_id][msg.sender][_spender] == _currentValues[i], "should be equal to allowance");
            }
            else
            {
                // fungibleの場合
                // current valueも一緒に送らないといけない
                require(_value == 0 || allowances[_id][msg.sender][_spender] == _currentValues[i], "should value id 0 or allowance is equal to current value");
            }

            allowances[_id][msg.sender][_spender] = _value;
            emit Approval(msg.sender, _spender, _id, _currentValues[i], _value);
        }
        return true;
    }

    function transfer
    (
        address _to,
        uint256[] _ids,
        uint256[] _values
    )
    external returns (bool)
    {
        uint256 _id;
        uint256 _value;
        uint256 _type;

        for (uint256 i = 0; i < _ids.length; ++i) {
            _id = _ids[i];
            _value = _values[i];
            _type = _ids[i] & TYPE_MASK;
            // check whether token is nft or not

            if (isNonFungible(_id)) {
                // non-fungibleの場合
                require(_value == 1, "token value should be 1");
                require(nfiOwners[_id] == msg.sender, "msg.sender should be token owner.");
                nfiOwners[_id] = _to;
            }

            items[_type].balances[msg.sender] = items[_type].balances[msg.sender].sub(_value);
            items[_type].balances[_to] = items[_type].balances[_to].add(_value);

            emit Transfer(msg.sender, msg.sender, _to, _id, _value);
        }
        return true;
    }

    function transferFrom
    (
        address _from,
        address _to,
        uint256[] _ids,
        uint256[] _values
    )
    external returns (bool)
    {
        uint256 _id;
        uint256 _value;
        uint256 _type;

        if(_from == tx.origin) {
            for(uint256 i = 0; i < _ids.length; ++i) {
                _id = _ids[i];
                _value = _values[i];

                if (isNonFungible(_id)) {
                    require(_value == 1, "value should be 1");
                    require(nfiOwners[_id] == _from, "value should be 1");
                    nfiOwners[_id] = _to;
                    _id = _id & TYPE_MASK;
                }

                items[_id].balances[_from] = items[_id].balances[_from].sub(_value);
                items[_id].balances[_to] = items[_id].balances[_to].add(_value);

                emit Transfer(msg.sender, _from, _to, _id, _value);
            }
            return true;
        }
        else
        {
            for (uint256 j = 0; j < _ids.length; ++j) {
                _id = _ids[j];
                _value = _values[j];
                _type = _id & TYPE_MASK;

                if (isNonFungible(_id)) {
                    require(_value == 1, "value should be 1");
                    nfiOwners[_id] = _to;
                    //nft の場合はid
                    allowances[_id][_from][msg.sender] = allowances[_type][_from][msg.sender].sub(_value);
                } else {
                    //ftの場合は_type
                    //safeMathがallowanceの確認になっている
                    allowances[_type][_from][msg.sender] = allowances[_type][_from][msg.sender].sub(_value);
                }

                items[_type].balances[_from] = items[_type].balances[_from].sub(_value);
                items[_type].balances[_to] = items[_type].balances[_to].add(_value);

                emit Transfer(msg.sender, _from, _to, _id, _value);
            }
            return true;
        }
    }

    function balanceOf
    (
        uint256 _typeId,
        address _owner
    )
    external view
    returns (uint256)
    {
        uint256 _type = _typeId & TYPE_MASK;
        return items[_type].balances[_owner];
    }

    /*
   @param _owner The owner whose token ID assigned to address
   @param _id The id of a token you want to get balance of.
   @dev This method must not be called from other functions because it costs too much.
        This method should only called from EOA.(Externally Owned Account.)
   */

    function nonFungibleOwnedTokens(address _owner, uint256 _id) external view returns (uint256[]) {
        uint256 _type = _id & TYPE_MASK;
        uint256 tokenCount = this.balanceOf(_type, _owner);
        require(isNonFungible(_type), "should be non-fungible");

        if (tokenCount == 0) {
            return new uint256[](0);
        } else {
            uint256[] memory result = new uint256[](tokenCount);
            uint256 totalNfTokens = this.totalSupply(_type);
            uint256 resultIndex = 0;

            uint256 nfTokenId;

            for (nfTokenId = 1; nfTokenId <= totalNfTokens; nfTokenId++) {
                uint256 tokenId = _type | nfTokenId;
                if (nfiOwners[tokenId] == _owner) {
                    result[resultIndex] = nfTokenId;
                    resultIndex++;
                }
            }

            return result;
        }

    }


    // Optional meta data view Functions

    function name(uint256 _id) external view returns (string) {
        uint256 _type = _id & TYPE_MASK;
        return items[_type].name;
    }

    function symbol(uint256 _id) external view returns (string) {
        uint256 _type = _id & TYPE_MASK;
        return symbols[_type];
    }

    function tokenDecimal
    (
        uint256 _id
    )
    external view
    returns (uint256)
    {
        uint256 _type = _id & TYPE_MASK;
        return decimals[_type];
    }

    function totalSupply
    (
        uint256 _typeId
    )
    external view
    returns (uint256)
    {
        uint256 _type = _typeId & TYPE_MASK;
        return items[_type].totalSupply;
    }

    function uri
    (
        uint256 _id
    )
    external view
    returns (string)
    {
        return metadataURIs[_id];
    }


}

contract SampleToken is ERC1155NonFungible, Ownable {
    uint256 public nonce;

    function mint
    (
        string _name,
        uint256 _totalSupply,
        string _uri,
        uint8 _decimals,
        string _symbol,
        bool _isNFI
    )
    external onlyOwner
    {

        uint256 _type = (++nonce << 128); // 128bit left shift base id
        if (_isNFI) {
            // non fungibleの場合はtokenは後から生成する
            require(_totalSupply == 0,"Non-fungible token supply should be 0 at first.");
            _type = _type | TYPE_NF_BIT; // top level bitを 1 に
        }

        items[_type].name = _name;
        items[_type].totalSupply = _totalSupply;
        metadataURIs[_type] = _uri;
        decimals[_type] = _decimals;
        symbols[_type] = _symbol;

        items[_type].balances[msg.sender] = _totalSupply;
        emit Mint(nonce, _name, _totalSupply, _uri, _decimals, _symbol, _isNFI);
    }

    function mintNonFungible
    (
        uint256 _type,
        address[] _to
    )
    external onlyOwner
    {
        require(isNonFungible(_type), "should be non fungible type");
        uint256 _startIndex = items[_type].totalSupply;
        for (uint256 i = 0; i < _to.length; ++i) {
            address _dst = _to[i];
            uint256 _nfi = _type | (_startIndex + i);
            nfiOwners[_nfi] = _dst;
            items[_type].balances[_dst] = items[_type].balances[_dst].add(1);
        }

        items[_type].totalSupply = items[_type].totalSupply.add(_to.length);
    }

    function setURI
    (
        uint256 _id,
        string _uri
    )
    external onlyOwner
    {
        metadataURIs[_id] = _uri;
    }
}
