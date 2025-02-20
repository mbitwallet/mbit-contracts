// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC20} from '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import {ERC20Pausable} from '@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol';
import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {ERC20Permit} from '@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol';

contract StableToken is ERC20, ERC20Pausable, Ownable, ERC20Permit {
    uint256 public maxSupply;
    bool public pausableRenounced = false;
    uint8 private _decimals;

    constructor(
        string memory tokenName,
        string memory tokenSymbol,
        uint8 decimals_,
        uint256 maxSupply_
    ) ERC20(tokenName, tokenSymbol) Ownable(msg.sender) ERC20Permit(tokenName) {
        _decimals = decimals_;
        maxSupply = maxSupply_;
    }

    function renouncePausable() public onlyOwner {
        require(!pausableRenounced, 'Pausable renounced');
        require(!paused(), 'Cannot renouce pausable while paused');
        pausableRenounced = true;
    }

    function pause() public onlyOwner {
        require(!pausableRenounced, 'Pausable renounced');
        _pause();
    }

    function unpause() public onlyOwner {
        require(!pausableRenounced, 'Pausable renounced');
        _unpause();
    }

    function mint(address to, uint256 amount) public onlyOwner {
        require(maxSupply == 0 || totalSupply() + amount <= maxSupply, 'Cannot mint more than max supply');
        _mint(to, amount);
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    // The following functions are overrides required by Solidity.
    function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Pausable) {
        super._update(from, to, value);
    }
}
