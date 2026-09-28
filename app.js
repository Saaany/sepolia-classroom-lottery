const CONTRACT_ADDRESS =
    "0x2776334292Cda649AD9469188921EB9C05698DF1";

const SEPOLIA_CHAIN_ID = 11155111;

const CONTRACT_ABI = [

    // ---------------------------------------------------------
    // PUBLIC STATE
    // ---------------------------------------------------------

    "function organizer() view returns (address)",

    "function minimumContribution() view returns (uint256)",

    "function currentRound() view returns (uint256)",

    "function roundActive() view returns (bool)",

    "function roundStartTime() view returns (uint256)",

    "function roundEndTime() view returns (uint256)",

    // ---------------------------------------------------------
    // ORGANIZER
    // ---------------------------------------------------------

    "function startRound()",

    "function stopRound()",

    // ---------------------------------------------------------
    // PLAYER
    // ---------------------------------------------------------

    "function enter() payable",

    // ---------------------------------------------------------
    // ROUND INFORMATION
    // ---------------------------------------------------------

    "function getCurrentRoundInfo() view returns (uint256 roundId, bool active, uint256 startTime, uint256 endTime, uint256 totalPot, uint256 playerCount, bool settled, address winner)",

    "function getRoundInfo(uint256 roundId) view returns (uint256 startTime, uint256 endTime, uint256 totalPot, bool settled, address winner, uint256 playerCount)",

    "function getPlayers(uint256 roundId) view returns (address[])",

    "function getContribution(uint256 roundId, address player) view returns (uint256)",

    "function hasEntered(uint256 roundId, address player) view returns (bool)",

    "function getWinningProbability(uint256 roundId, address player) view returns (uint256)",

    "function calculatePotentialReward(uint256 roundId, address player) view returns (uint256)",

    "function getContractBalance() view returns (uint256)",

    "function getMinimumContribution() view returns (uint256)"
];


let provider = null;
let signer = null;
let contract = null;

let userAddress = null;
let organizerAddress = null;

let isOrganizer = false;

let timerInterval = null;


// =============================================================
// PAGE LOAD
// =============================================================

window.addEventListener(
    "load",
    async function () {

        if (!window.ethereum) {

            setWalletStatus(
                "MetaMask is not installed"
            );

            return;
        }

        try {

            provider =
                new ethers.BrowserProvider(
                    window.ethereum
                );

            const accounts =
                await window.ethereum.request({
                    method: "eth_accounts"
                });

            if (accounts.length > 0) {

                await initializeWallet(
                    accounts[0]
                );
            }

        } catch (error) {

            console.error(error);
        }


        window.ethereum.on(
            "accountsChanged",
            async function(accounts) {

                if (accounts.length === 0) {

                    resetWallet();

                } else {

                    await initializeWallet(
                        accounts[0]
                    );
                }
            }
        );


        window.ethereum.on(
            "chainChanged",
            function() {

                window.location.reload();

            }
        );


        setInterval(
            refreshAll,
            5000
        );
    }
);


// =============================================================
// CONNECT WALLET
// =============================================================

async function connectWallet() {

    try {

        if (!window.ethereum) {

            alert(
                "Please install MetaMask first."
            );

            return;
        }

        await window.ethereum.request({
            method: "eth_requestAccounts"
        });

        provider =
            new ethers.BrowserProvider(
                window.ethereum
            );

        const network =
            await provider.getNetwork();

        if (
            Number(network.chainId) !==
            SEPOLIA_CHAIN_ID
        ) {

            alert(
                "Please switch MetaMask to Ethereum Sepolia."
            );

            return;
        }

        const accounts =
            await provider.listAccounts();

        if (accounts.length === 0) {
            return;
        }

        await initializeWallet(
            accounts[0].address
        );

    } catch (error) {

        console.error(error);

        showError(
            "walletStatus",
            readableError(error)
        );
    }
}


// =============================================================
// INITIALIZE WALLET
// =============================================================

async function initializeWallet(address) {

    try {

        if (
            !CONTRACT_ADDRESS ||
            CONTRACT_ADDRESS ===
            "PASTE_YOUR_NEW_CONTRACT_ADDRESS_HERE"
        ) {

            setWalletStatus(
                "Contract address has not been configured"
            );

            return;
        }

        provider =
            new ethers.BrowserProvider(
                window.ethereum
            );

        const network =
            await provider.getNetwork();

        if (
            Number(network.chainId) !==
            SEPOLIA_CHAIN_ID
        ) {

            setWalletStatus(
                "Please switch to Sepolia"
            );

            return;
        }

        signer =
            await provider.getSigner();

        userAddress =
            await signer.getAddress();

        contract =
            new ethers.Contract(
                CONTRACT_ADDRESS,
                CONTRACT_ABI,
                signer
            );

        organizerAddress =
            await contract.organizer();

        isOrganizer =
            userAddress.toLowerCase() ===
            organizerAddress.toLowerCase();


        document.getElementById(
            "walletAddress"
        ).textContent =
            shortenAddress(
                userAddress
            );


        setWalletStatus(
            isOrganizer
                ? "Connected — Organizer"
                : "Connected — Student"
        );


        document.getElementById(
            "connectButton"
        ).textContent =
            "Wallet Connected";


        if (isOrganizer) {

            document.getElementById(
                "organizerPanel"
            ).classList.remove("hidden");

            document.getElementById(
                "studentPanel"
            ).classList.add("hidden");

        } else {

            document.getElementById(
                "organizerPanel"
            ).classList.add("hidden");

            document.getElementById(
                "studentPanel"
            ).classList.remove("hidden");
        }


        await refreshAll();

    } catch (error) {

        console.error(error);

        showError(
            "walletStatus",
            readableError(error)
        );
    }
}


// =============================================================
// REFRESH
// =============================================================

async function refreshAll() {

    if (!contract) {
        return;
    }

    try {

        await loadRound();

        await loadMinimumContribution();

        await loadPlayers();

        await updateStudentControls();

        await loadLatestResult();

    } catch (error) {

        console.error(
            "Refresh error:",
            error
        );
    }
}


// =============================================================
// LOAD ROUND
// =============================================================

async function loadRound() {

    const info =
        await contract.getCurrentRoundInfo();

    const roundId = info[0];

    const active = info[1];

    const startTime =
        Number(info[2]);

    const totalPot =
        info[4];

    const playerCount =
        Number(info[5]);


    document.getElementById(
        "roundNumber"
    ).textContent =
        roundId.toString();


    document.getElementById(
        "totalPot"
    ).textContent =
        formatEth(totalPot) +
        " ETH";


    document.getElementById(
        "playerCount"
    ).textContent =
        playerCount;


    if (active) {

        document.getElementById(
            "roundStatus"
        ).textContent =
            "🟢 Round is ACTIVE";

        startCountUpTimer(
            startTime
        );

    } else {

        document.getElementById(
            "roundStatus"
        ).textContent =
            "🔴 Round is STOPPED";

        stopCountUpTimer();

        document.getElementById(
            "timer"
        ).textContent =
            "00:00";
    }


    if (isOrganizer) {

        document.getElementById(
            "startRoundButton"
        ).disabled =
            active;

        document.getElementById(
            "stopRoundButton"
        ).disabled =
            !active;
    }
}


// =============================================================
// MINIMUM CONTRIBUTION
// =============================================================

async function loadMinimumContribution() {

    const minimum =
        await contract.minimumContribution();

    document.getElementById(
        "minimumContribution"
    ).textContent =
        formatEth(minimum) +
        " ETH";
}


// =============================================================
// COUNT-UP TIMER
// =============================================================

function startCountUpTimer(
    startTimestamp
) {

    stopCountUpTimer();


    function updateTimer() {

        const now =
            Math.floor(
                Date.now() / 1000
            );

        let elapsed =
            now - startTimestamp;


        if (elapsed < 0) {
            elapsed = 0;
        }


        const minutes =
            Math.floor(
                elapsed / 60
            );

        const seconds =
            elapsed % 60;


        document.getElementById(
            "timer"
        ).textContent =

            String(minutes)
                .padStart(2, "0")

            +

            ":" +

            String(seconds)
                .padStart(2, "0");
    }


    updateTimer();


    timerInterval =
        setInterval(
            updateTimer,
            1000
        );
}


function stopCountUpTimer() {

    if (timerInterval) {

        clearInterval(
            timerInterval
        );

        timerInterval = null;
    }
}


// =============================================================
// START ROUND
// =============================================================

async function startRound() {

    if (!isOrganizer) {
        return;
    }

    try {

        setOrganizerMessage(
            "Starting round..."
        );


        const tx =
            await contract.startRound();


        setOrganizerMessage(
            "Transaction submitted. Waiting for confirmation..."
        );


        await tx.wait();


        setOrganizerMessage(
            "✅ Round started successfully!"
        );


        await refreshAll();

    } catch (error) {

        console.error(error);

        setOrganizerMessage(
            "❌ " +
            readableError(error)
        );
    }
}


// =============================================================
// STOP ROUND
// =============================================================

async function stopRound() {

    if (!isOrganizer) {
        return;
    }

    try {

        const confirmed =
            confirm(
                "Stop the current round and select the winner?"
            );


        if (!confirmed) {
            return;
        }


        setOrganizerMessage(
            "Stopping round and selecting winner..."
        );


        const tx =
            await contract.stopRound();


        setOrganizerMessage(
            "Transaction submitted. Waiting for confirmation..."
        );


        await tx.wait();


        setOrganizerMessage(
            "🏆 Round stopped and winner selected!"
        );


        await refreshAll();

    } catch (error) {

        console.error(error);

        setOrganizerMessage(
            "❌ " +
            readableError(error)
        );
    }
}


// =============================================================
// ENTER LOTTERY
// =============================================================

async function enterLottery() {

    if (isOrganizer) {

        setEntryMessage(
            "Organizer cannot enter the lottery."
        );

        return;
    }


    if (!contract) {

        setEntryMessage(
            "Please connect MetaMask first."
        );

        return;
    }


    const amountInput =
        document.getElementById(
            "amountInput"
        );


    const amount =
        amountInput.value.trim();


    if (!amount) {

        setEntryMessage(
            "Please enter an ETH amount."
        );

        return;
    }


    try {

        const info =
            await contract.getCurrentRoundInfo();

        const active =
            info[1];

        const roundId =
            info[0];


        if (!active) {

            setEntryMessage(
                "The lottery is not currently active."
            );

            return;
        }


        const alreadyEntered =
            await contract.hasEntered(
                roundId,
                userAddress
            );


        if (alreadyEntered) {

            setEntryMessage(
                "You have already entered this round."
            );

            return;
        }


        let value;


        try {

            value =
                ethers.parseEther(
                    amount
                );

        } catch (error) {

            setEntryMessage(
                "Invalid ETH amount."
            );

            return;
        }


        const minimum =
            await contract.minimumContribution();


        if (value < minimum) {

            setEntryMessage(
                "Minimum contribution is " +
                formatEth(minimum) +
                " ETH."
            );

            return;
        }


        const button =
            document.getElementById(
                "enterButton"
            );


        button.disabled = true;

        button.textContent =
            "Confirm in MetaMask...";


        setEntryMessage(
            "Please confirm the transaction in MetaMask."
        );


        const tx =
            await contract.enter({
                value: value
            });


        button.textContent =
            "Waiting for confirmation...";


        setEntryMessage(
            "Transaction submitted. Waiting for blockchain confirmation..."
        );


        await tx.wait();


        button.textContent =
            "Entered ✓";


        setEntryMessage(
            "🎟️ Successfully entered the lottery!"
        );


        amountInput.value = "";


        await refreshAll();

    } catch (error) {

        console.error(
            "Entry error:",
            error
        );


        const button =
            document.getElementById(
                "enterButton"
            );


        button.disabled = false;

        button.textContent =
            "Enter Lottery";


        setEntryMessage(
            "❌ " +
            readableError(error)
        );
    }
}


// =============================================================
// STUDENT CONTROLS
// =============================================================

async function updateStudentControls() {

    if (
        isOrganizer ||
        !contract
    ) {
        return;
    }


    try {

        const info =
            await contract.getCurrentRoundInfo();


        const active =
            info[1];

        const roundId =
            info[0];


        const entered =
            await contract.hasEntered(
                roundId,
                userAddress
            );


        const button =
            document.getElementById(
                "enterButton"
            );


        const input =
            document.getElementById(
                "amountInput"
            );


        if (!active) {

            button.disabled = true;

            button.textContent =
                "Round Not Active";

            input.disabled = true;

        } else if (entered) {

            button.disabled = true;

            button.textContent =
                "Already Entered ✓";

            input.disabled = true;

        } else {

            button.disabled = false;

            button.textContent =
                "Enter Lottery";

            input.disabled = false;
        }

    } catch (error) {

        console.error(error);
    }
}


// =============================================================
// LOAD PLAYERS
// =============================================================

async function loadPlayers() {

    if (!contract) {
        return;
    }


    try {

        const roundId =
            await contract.currentRound();


        const players =
            await contract.getPlayers(
                roundId
            );


        const container =
            document.getElementById(
                "playersList"
            );


        if (players.length === 0) {

            container.innerHTML =
                "No players yet.";

            return;
        }


        container.innerHTML = "";


        for (
            let i = 0;
            i < players.length;
            i++
        ) {

            const player =
                players[i];


            const contribution =
                await contract.getContribution(
                    roundId,
                    player
                );


            const probability =
                await contract.getWinningProbability(
                    roundId,
                    player
                );


            const potentialReward =
                await contract.calculatePotentialReward(
                    roundId,
                    player
                );


            const probabilityPercent =
                Number(
                    ethers.formatUnits(
                        probability,
                        16
                    )
                );


            const div =
                document.createElement(
                    "div"
                );


            div.className =
                "player";


            div.innerHTML = `

                <strong>
                    Player ${i + 1}
                </strong>

                <br>

                ${shortenAddress(player)}

                <br>

                Contribution:
                ${formatEth(contribution)}
                ETH

                <div class="probability">
                    Winning Probability:
                    ${probabilityPercent.toFixed(2)}%
                </div>

                <div>
                    Potential Reward:
                    ${formatEth(potentialReward)}
                    ETH
                </div>
            `;


            container.appendChild(div);
        }

    } catch (error) {

        console.error(
            "Player loading error:",
            error
        );
    }
}


// =============================================================
// LOAD LATEST RESULT
// =============================================================

async function loadLatestResult() {

    if (!contract) {
        return;
    }


    try {

        const currentRound =
            await contract.currentRound();


        const current =
            Number(currentRound);


        if (current <= 1) {

            document.getElementById(
                "resultCard"
            ).classList.add("hidden");

            return;
        }


        const previousRound =
            current - 1;


        const info =
            await contract.getRoundInfo(
                previousRound
            );


        const winner =
            info[4];


        const totalPot =
            info[2];


        if (
            !winner ||
            winner === ethers.ZeroAddress
        ) {

            document.getElementById(
                "resultCard"
            ).classList.add("hidden");

            return;
        }


        const winnerContribution =
            await contract.getContribution(
                previousRound,
                winner
            );


        const winnerProbability =
            await contract.getWinningProbability(
                previousRound,
                winner
            );


        const winnerPrize =
            await contract.calculatePotentialReward(
                previousRound,
                winner
            );


        const organizerShare =
            totalPot -
            winnerPrize;


        const probabilityPercent =
            Number(
                ethers.formatUnits(
                    winnerProbability,
                    16
                )
            );


        const result =
            document.getElementById(
                "latestResult"
            );


        result.innerHTML = `

            <p>
                <strong>Round:</strong>
                ${previousRound}
            </p>

            <p>
                <strong>Winner:</strong>
                <br>
                ${winner}
            </p>

            <p>
                <strong>Winner Contribution:</strong>
                ${formatEth(winnerContribution)}
                ETH
            </p>

            <p>
                <strong>Winning Probability:</strong>
                ${probabilityPercent.toFixed(2)}%
            </p>

            <p>
                <strong>Total Pot:</strong>
                ${formatEth(totalPot)}
                ETH
            </p>

            <p>
                <strong>Winner Reward:</strong>
                ${formatEth(winnerPrize)}
                ETH
            </p>

            <p>
                <strong>Organizer Share:</strong>
                ${formatEth(organizerShare)}
                ETH
            </p>
        `;


        document.getElementById(
            "resultCard"
        ).classList.remove("hidden");

    } catch (error) {

        console.error(
            "Result loading error:",
            error
        );
    }
}


// =============================================================
// RESET WALLET
// =============================================================

function resetWallet() {

    userAddress = null;

    signer = null;

    contract = null;

    organizerAddress = null;

    isOrganizer = false;


    stopCountUpTimer();


    setWalletStatus(
        "Not connected"
    );


    document.getElementById(
        "walletAddress"
    ).textContent =
        "-";


    document.getElementById(
        "organizerPanel"
    ).classList.add("hidden");


    document.getElementById(
        "studentPanel"
    ).classList.add("hidden");
}


// =============================================================
// UI HELPERS
// =============================================================

function setWalletStatus(message) {

    document.getElementById(
        "walletStatus"
    ).textContent =
        message;
}


function setEntryMessage(message) {

    document.getElementById(
        "entryMessage"
    ).textContent =
        message;
}


function setOrganizerMessage(message) {

    document.getElementById(
        "organizerMessage"
    ).textContent =
        message;
}


function showError(
    elementId,
    message
) {

    document.getElementById(
        elementId
    ).textContent =
        message;
}


// =============================================================
// FORMAT ETH
// =============================================================

function formatEth(value) {

    try {

        return Number(
            ethers.formatEther(value)
        ).toFixed(4);

    } catch (error) {

        return "0.0000";
    }
}


// =============================================================
// SHORT ADDRESS
// =============================================================

function shortenAddress(address) {

    if (!address) {
        return "-";
    }

    return (
        address.substring(0, 6) +
        "..." +
        address.substring(
            address.length - 4
        )
    );
}


// =============================================================
// ERROR HANDLING
// =============================================================

function readableError(error) {

    console.error(error);


    if (
        error &&
        error.code === 4001
    ) {

        return "Transaction rejected in MetaMask.";
    }


    if (
        error &&
        error.code === "ACTION_REJECTED"
    ) {

        return "Transaction rejected in MetaMask.";
    }


    if (
        error &&
        error.reason
    ) {

        return error.reason;
    }


    if (
        error &&
        error.shortMessage
    ) {

        return error.shortMessage;
    }


    if (
        error &&
        error.message
    ) {

        return error.message;
    }


    return (
        "Transaction failed. " +
        "Check MetaMask and the Sepolia network."
    );
}