// Base network configuration
const BASE_CHAIN_ID = '0x2105'; // Base mainnet chain ID (8453 in hex)
const BASE_RPC_URL = 'https://mainnet.base.org';

// Global variables to store wallet info
let provider;
let signer;
let userAddress;

// Get references to HTML elements
const connectBtn = document.getElementById('connectBtn');
const sendTipBtn = document.getElementById('sendTipBtn');
const statusDiv = document.getElementById('status');
const recipientInput = document.getElementById('recipient');
const amountInput = document.getElementById('amount');
const messageInput = document.getElementById('message');

// Function to show status messages
function showStatus(message, isError = false) {
  statusDiv.textContent = message;
  statusDiv.style.backgroundColor = isError ? '#fee' : '#efe';
  statusDiv.style.color = isError ? '#c33' : '#3c3';
  statusDiv.style.display = 'block';
}

// Function to connect wallet
async function connectWallet() {
  try {
    // Check if MetaMask or compatible wallet is installed
    if (typeof window.ethereum === 'undefined') {
      showStatus('Please install MetaMask or a Web3 wallet!', true);
      return;
    }

    // Request account access
    const accounts = await window.ethereum.request({ 
      method: 'eth_requestAccounts' 
    });
    
    userAddress = accounts[0];
    
    // Create ethers provider and signer
    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();
    
    // Check if user is on Base network
    const network = await provider.getNetwork();
    
    if (network.chainId !== 8453) {
      // Try to switch to Base network
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: BASE_CHAIN_ID }],
        });
      } catch (switchError) {
        // If Base network is not added, add it
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: BASE_CHAIN_ID,
              chainName: 'Base',
              nativeCurrency: {
                name: 'Ethereum',
                symbol: 'ETH',
                decimals: 18
              },
              rpcUrls: [BASE_RPC_URL],
              blockExplorerUrls: ['https://basescan.org']
            }]
          });
        } else {
          throw switchError;
        }
      }
    }
    
    // Update UI after successful connection
    showStatus(`Connected: ${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`);
    connectBtn.style.display = 'none';
    sendTipBtn.style.display = 'block';
    
  } catch (error) {
    console.error(error);
    showStatus('Failed to connect wallet: ' + error.message, true);
  }
}

// Function to resolve BaseName to address
async function resolveRecipient(input) {
  // If it looks like an Ethereum address (starts with 0x and is 42 chars)
  if (input.startsWith('0x') && input.length === 42) {
    return input;
  }
  
  // If it's a BaseName (ends with .base.eth), resolve it
  if (input.endsWith('.base.eth')) {
    try {
      const address = await provider.resolveName(input);
      if (address) {
        return address;
      } else {
        throw new Error('BaseName not found');
      }
    } catch (error) {
      throw new Error('Could not resolve BaseName');
    }
  }
  
  throw new Error('Invalid recipient address or BaseName');
}

// Function to send tip
async function sendTip() {
  try {
    // Get values from input fields
    const recipientInput = document.getElementById('recipient').value.trim();
    const amount = document.getElementById('amount').value;
    const message = document.getElementById('message').value;
    
    // Validate inputs
    if (!recipientInput) {
      showStatus('Please enter recipient address or BaseName', true);
      return;
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      showStatus('Please enter a valid tip amount', true);
      return;
    }
    
    showStatus('Resolving recipient...');
    
    // Resolve recipient (convert BaseName to address if needed)
    const recipientAddress = await resolveRecipient(recipientInput);
    
    showStatus('Preparing transaction...');
    
    // Convert amount to wei (smallest ETH unit)
    const amountInWei = ethers.utils.parseEther(amount);
    
    // Create transaction object
    const tx = {
      to: recipientAddress,
      value: amountInWei,
      // Optional: add message as data (costs a bit more gas)
      data: message ? ethers.utils.toUtf8Bytes(message) : '0x'
    };
    
    showStatus('Please confirm transaction in your wallet...');
    
    // Send transaction
    const transaction = await signer.sendTransaction(tx);
    
    showStatus('Transaction sent! Waiting for confirmation...');
    
    // Wait for transaction to be mined
    const receipt = await transaction.wait();
    
    showStatus(`✅ Tip sent successfully! TX: ${receipt.transactionHash.slice(0, 10)}...`);
    
    // Clear inputs
    document.getElementById('recipient').value = '';
    document.getElementById('amount').value = '';
    document.getElementById('message').value = '';
    
  } catch (error) {
    console.error(error);
    showStatus('Failed to send tip: ' + error.message, true);
  }
}

// Event listeners
connectBtn.addEventListener('click', connectWallet);
sendTipBtn.addEventListener('click', sendTip);

// Listen for account changes
if (typeof window.ethereum !== 'undefined') {
  window.ethereum.on('accountsChanged', (accounts) => {
    if (accounts.length === 0) {
      // User disconnected wallet
      showStatus('Wallet disconnected', true);
      connectBtn.style.display = 'block';
      sendTipBtn.style.display = 'none';
    } else {
      // User switched accounts
      userAddress = accounts[0];
      showStatus(`Switched to: ${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`);
    }
  });
  
  window.ethereum.on('chainChanged', () => {
    // Reload page when chain changes
    window.location.reload();
  });
}
