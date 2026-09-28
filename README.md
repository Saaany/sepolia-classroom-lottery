# 🎟️ Sepolia Classroom Lottery

An educational weighted lottery DApp built with Solidity, Ethereum Sepolia, MetaMask, Ethers.js, and GitHub Pages.

This project is intended for classroom demonstrations using **Ethereum Sepolia test ETH**.

---

## ⚠️ Educational Warning

This project is designed for educational purposes.

The winner-selection mechanism uses:

* `block.prevrandao`
* `block.timestamp`
* round information

This is **not secure randomness for a production application involving real money**.

For a production lottery or other application involving valuable assets, a verifiable randomness system such as Chainlink VRF or another appropriate oracle-based mechanism should be considered.

---

# 1. Project Overview

The application demonstrates how a smart contract can manage a manually controlled lottery on Ethereum Sepolia.

There is one organizer.

Students participate as players.

The organizer:

1. Deploys the contract.
2. Starts a round.
3. Allows students to enter.
4. Stops the round.
5. The smart contract selects the winner.
6. The winner is paid according to the project's reward formula.
7. The remaining amount is transferred to the organizer.
8. A new round is prepared automatically.

The organizer must manually start every new round.

---

# 2. Lottery Rules

## Organizer

The wallet that deploys the contract becomes the organizer.

The organizer:

* cannot enter the lottery;
* can start a round;
* can stop a round;
* can select the winner by stopping the round.

The organizer does not have an Enter Lottery button in the frontend.

---

# 3. Student Entry

A student can enter only while a round is active.

Each wallet can enter **once per round**.

The student can contribute any amount greater than or equal to the minimum contribution.

For example, if the minimum is:

```text
0.001 ETH
```

then valid entries include:

```text
0.001 ETH
0.002 ETH
0.005 ETH
0.010 ETH
```

Each student's contribution is stored by the smart contract.

---

# 4. Weighted Winning Probability

The lottery uses contribution-weighted probability.

Let:

* `A_i` = contribution of player `i`
* `T` = total pot

Then:

```text
P_i = A_i / T
```

Therefore, a player who contributes more has a larger probability of winning.

### Example

Suppose:

```text
Player A = 0.001 ETH
Player B = 0.003 ETH
Player C = 0.006 ETH
```

Total:

```text
0.010 ETH
```

Probabilities:

```text
A = 0.001 / 0.010 = 10%

B = 0.003 / 0.010 = 30%

C = 0.006 / 0.010 = 60%
```

---

# 5. Winner Reward Formula

The winner receives their original contribution plus an additional reward based on their winning probability.

The formula is:

```text
Reward = Contribution × (1 + Winning Probability)
```

Therefore:

```text
R_i = A_i(1 + P_i)
```

Since:

```text
P_i = A_i / T
```

the formula can also be written as:

```text
R_i = A_i + A_i² / T
```

---

# 6. Reward Cap

The calculated reward cannot exceed the total pot.

Therefore, the actual reward is:

```text
Final Reward =
min(
    Contribution × (1 + Winning Probability),
    Total Pot
)
```

This guarantees that the smart contract never attempts to pay more than the available pot.

---

# 7. Reward Example

Suppose:

```text
Total Pot = 0.010 ETH
Winner Contribution = 0.006 ETH
```

The winner's probability is:

```text
P = 0.006 / 0.010
  = 0.60
```

Calculated reward:

```text
Reward
= 0.006 × (1 + 0.60)
= 0.0096 ETH
```

Since:

```text
0.0096 < 0.010
```

the winner receives:

```text
0.0096 ETH
```

The organizer receives:

```text
0.010 - 0.0096
= 0.0004 ETH
```

---

# 8. Example Where the Cap Applies

Suppose:

```text
Total Pot = 0.010 ETH
Winner Contribution = 0.007 ETH
```

Winning probability:

```text
P = 0.007 / 0.010
  = 0.70
```

Calculated reward:

```text
0.007 × (1 + 0.70)
= 0.0119 ETH
```

But the pot contains only:

```text
0.010 ETH
```

Therefore:

```text
Final Reward
= min(0.0119, 0.010)
= 0.010 ETH
```

The organizer receives:

```text
0 ETH
```

The contract therefore never needs to provide additional ETH from outside the pot.

---

# 9. What Happens to the Remaining Pot?

After calculating the winner's final reward:

```text
Organizer Share = Total Pot - Winner Reward
```

Therefore:

```text
Total Pot =
Winner Reward + Organizer Share
```

The entire pot is distributed.

There is no leftover ETH trapped in the contract after a normal settled round.

---

# 10. Special Cases

## Zero Players

If the organizer stops a round and nobody entered:

```text
Winner = none
Winner Reward = 0
Organizer Share = 0
```

The round is marked as settled and a new round is prepared.

---

## One Player

If exactly one student enters:

```text
P = 1.00
```

The calculated reward is:

```text
A × (1 + 1)
= 2A
```

However, the reward is capped at the total pot.

Because:

```text
A = Total Pot
```

the final reward becomes:

```text
Total Pot
```

Therefore, the sole player receives the entire pot.

---

# 11. Technology Stack

* Solidity `^0.8.24`
* Ethereum Sepolia Testnet
* Remix IDE
* MetaMask
* Ethers.js 6.13.5
* HTML
* CSS
* JavaScript
* GitHub Pages

---

# 12. Project Structure

```text
sepolia-classroom-lottery/
│
├── index.html
├── app.js
├── README.md
├── .gitignore
│
└── contracts/
    └── SepoliaClassroomLottery.sol
```

---

# 13. Deploying the Smart Contract

Open Remix IDE.

Create:

```text
SepoliaClassroomLottery.sol
```

Paste the contract code.

Compile with Solidity:

```text
0.8.24
```

Then go to:

```text
Deploy & Run Transactions
```

Select:

```text
Injected Provider - MetaMask
```

Make sure MetaMask is connected to:

```text
Ethereum Sepolia
```

---

# 14. Constructor Parameter

The contract requires one constructor parameter:

```text
_minimumContribution
```

For a minimum contribution of:

```text
0.001 ETH
```

enter:

```text
1000000000000000
```

because:

```text
0.001 ETH = 1000000000000000 wei
```

Do not enter:

```text
0.001 ETH
```

in the Remix constructor field.

Enter:

```text
1000000000000000
```

---

# 15. Deploy

Click:

```text
Deploy
```

The wallet that performs the deployment becomes the organizer.

Copy the deployed contract address.

It will look similar to:

```text
0x1234...abcd
```

---

# 16. Configure the Frontend

Open:

```text
app.js
```

Find:

```javascript
const CONTRACT_ADDRESS =
    "PASTE_YOUR_NEW_CONTRACT_ADDRESS_HERE";
```

Replace it with your actual deployed contract address.

For example:

```javascript
const CONTRACT_ADDRESS =
    "0x1234567890abcdef1234567890abcdef12345678";
```

Do not put an ENS name there.

Do not put quotation marks around the address other than the JavaScript string quotation marks.

---

# 17. Test the Contract in Remix

Before publishing the website, test the contract directly in Remix.

### Step 1

Call:

```text
organizer()
```

Confirm that it returns the deployment wallet address.

### Step 2

Call:

```text
minimumContribution()
```

Confirm that it returns:

```text
1000000000000000
```

for a 0.001 ETH minimum.

### Step 3

Call:

```text
startRound()
```

using the organizer wallet.

### Step 4

Switch MetaMask to a student wallet.

Call:

```text
enter()
```

and send some Sepolia test ETH.

For example:

```text
0.001 ETH
```

### Step 5

Use additional student wallets and enter different amounts.

Example:

```text
Student A = 0.001 ETH
Student B = 0.003 ETH
Student C = 0.006 ETH
```

### Step 6

Switch back to the organizer wallet.

Call:

```text
stopRound()
```

The smart contract will:

1. Stop the round.
2. Calculate weighted probabilities.
3. Select a weighted winner.
4. Calculate the winner's reward.
5. Apply the pot cap.
6. Pay the winner.
7. Pay the organizer the remainder.
8. Prepare the next round.

---
# 18. Student Workflow

Each student needs:

1. MetaMask.
2. Ethereum Sepolia network selected.
3. Sepolia test ETH.
4. The GitHub Pages URL.

The student opens the website and clicks:

```text
Connect MetaMask
```

If the connected wallet is not the organizer, the student sees:

```text
Enter Lottery
```

The student enters an amount and confirms the transaction.

---

# 19. Organizer Workflow

The organizer connects the deployment wallet.

The organizer sees:

```text
Start Round
Stop Round & Select Winner
```

The organizer does not see the student entry panel.

The organizer:

```text
Start Round
      ↓
Students Enter
      ↓
Monitor Players
      ↓
Stop Round & Select Winner
      ↓
Winner Paid
      ↓
Organizer Receives Remaining Pot
      ↓
Next Round Prepared
      ↓
Start Round Again
```

---

# 20. Security / Educational Limitations

This project intentionally uses simplified randomness:

```solidity
block.prevrandao
block.timestamp
```

These values should not be considered secure randomness for applications involving real money or other valuable assets.

A production implementation should use a secure verifiable randomness mechanism.

Other production considerations include:

* formal security auditing;
* robust access control;
* secure randomness;
* gas optimization;
* emergency withdrawal procedures;
* handling failed payments;
* economic analysis;
* denial-of-service considerations;
* frontend transaction-state handling.

---

# 21. Learning Objectives

This project demonstrates:

* Ethereum smart contracts;
* Solidity;
* payable functions;
* ETH transfers;
* mappings;
* structs;
* events;
* modifiers;
* access control;
* reentrancy protection;
* weighted probability;
* on-chain state management;
* blockchain transactions;
* MetaMask integration;
* Ethers.js;
* frontend-to-smart-contract communication;
* GitHub Pages deployment;
* Sepolia testnet usage.

---

# 22. Important Formula Summary

### Winning probability

```text
P_i = A_i / T
```

### Uncapped reward

```text
R_i = A_i(1 + P_i)
```

### Capped reward

```text
R_i = min(A_i(1 + P_i), T)
```

### Organizer share

```text
Organizer Share = T - R_i
```

Therefore:

```text
Winner Reward + Organizer Share = Total Pot
```

and:

```text
Winner Reward <= Total Pot
```

The contract enforces these calculations on-chain.
