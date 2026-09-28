// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title SepoliaClassroomLottery
 * @notice Educational weighted lottery for the Ethereum Sepolia testnet.
 *
 * IMPORTANT:
 * This contract is designed for classroom/educational use with test ETH.
 *
 * Weighted probability:
 *
 *     P_i = contribution_i / totalPot
 *
 * Winner reward:
 *
 *     R_i = min(contribution_i * (1 + P_i), totalPot)
 *
 * The amount remaining after paying the winner goes to the organizer.
 *
 * Randomness uses block.prevrandao and block.timestamp and is NOT
 * secure enough for production applications involving real value.
 */
contract SepoliaClassroomLottery {
    // =============================================================
    // STATE VARIABLES
    // =============================================================

    address payable public immutable organizer;

    uint256 public immutable minimumContribution;

    uint256 public currentRound;

    bool public roundActive;

    uint256 public roundStartTime;

    uint256 public roundEndTime;

    bool private locked;

    // =============================================================
    // ROUND DATA
    // =============================================================

    struct Round {
        uint256 startTime;
        uint256 endTime;
        uint256 totalPot;
        bool settled;
        address winner;

        address[] players;

        mapping(address => bool) entered;
        mapping(address => uint256) contribution;
    }

    mapping(uint256 => Round) private rounds;

    // =============================================================
    // EVENTS
    // =============================================================

    event RoundStarted(
        uint256 indexed roundId,
        uint256 startTime
    );

    event PlayerEntered(
        uint256 indexed roundId,
        address indexed player,
        uint256 amount
    );

    event WinnerSelected(
        uint256 indexed roundId,
        address indexed winner,
        uint256 winnerContribution,
        uint256 winningProbabilityNumerator,
        uint256 totalPot,
        uint256 calculatedReward,
        uint256 winnerPrize,
        uint256 organizerShare
    );

    event EmptyRound(
        uint256 indexed roundId
    );

    event RoundStopped(
        uint256 indexed roundId,
        uint256 endTime
    );

    // =============================================================
    // MODIFIERS
    // =============================================================

    modifier onlyOrganizer() {
        require(
            msg.sender == organizer,
            "Only organizer can perform this action"
        );
        _;
    }

    modifier nonReentrant() {
        require(
            !locked,
            "Reentrancy detected"
        );

        locked = true;
        _;
        locked = false;
    }

    // =============================================================
    // CONSTRUCTOR
    // =============================================================

    constructor(uint256 _minimumContribution) {
        require(
            _minimumContribution > 0,
            "Minimum contribution must be greater than zero"
        );

        organizer = payable(msg.sender);

        minimumContribution = _minimumContribution;

        currentRound = 1;

        roundActive = false;

        roundStartTime = 0;
        roundEndTime = 0;
    }

    // =============================================================
    // ORGANIZER FUNCTIONS
    // =============================================================

    /**
     * @notice Start the current round.
     */
    function startRound()
        external
        onlyOrganizer
    {
        require(
            !roundActive,
            "A round is already active"
        );

        Round storage round = rounds[currentRound];

        require(
            !round.settled,
            "Current round is already settled"
        );

        roundActive = true;

        roundStartTime = block.timestamp;

        roundEndTime = 0;

        round.startTime = block.timestamp;

        round.endTime = 0;

        emit RoundStarted(
            currentRound,
            block.timestamp
        );
    }

    /**
     * @notice Stop the current round and select the winner.
     *
     * Winner probability:
     *
     *     contribution / totalPot
     *
     * Winner reward:
     *
     *     min(
     *         contribution * (1 + probability),
     *         totalPot
     *     )
     *
     * Organizer receives the remaining balance.
     */
    function stopRound()
        external
        onlyOrganizer
        nonReentrant
    {
        require(
            roundActive,
            "No active round"
        );

        Round storage round = rounds[currentRound];

        roundEndTime = block.timestamp;

        round.endTime = block.timestamp;

        roundActive = false;

        emit RoundStopped(
            currentRound,
            block.timestamp
        );

        uint256 playerCount = round.players.length;

        // ---------------------------------------------------------
        // CASE 1: NO PLAYERS
        // ---------------------------------------------------------

        if (playerCount == 0) {
            round.settled = true;

            emit EmptyRound(currentRound);

            _prepareNextRound();

            return;
        }

        // ---------------------------------------------------------
        // CASE 2: PLAYERS EXIST
        // ---------------------------------------------------------

        uint256 totalPot = round.totalPot;

        require(
            totalPot > 0,
            "Pot must be greater than zero"
        );

        // ---------------------------------------------------------
        // WEIGHTED RANDOM SELECTION
        //
        // Every wei in the pot represents one unit of probability.
        //
        // Example:
        //
        // A = 0.001 ETH
        // B = 0.003 ETH
        // C = 0.006 ETH
        //
        // A = 10%
        // B = 30%
        // C = 60%
        // ---------------------------------------------------------

        uint256 randomNumber = uint256(
            keccak256(
                abi.encodePacked(
                    block.prevrandao,
                    block.timestamp,
                    currentRound,
                    totalPot,
                    round.players.length
                )
            )
        );

        uint256 randomPoint = randomNumber % totalPot;

        uint256 cumulativeContribution = 0;

        address payable winner = payable(address(0));

        for (
            uint256 i = 0;
            i < round.players.length;
            i++
        ) {
            address player = round.players[i];

            cumulativeContribution +=
                round.contribution[player];

            if (randomPoint < cumulativeContribution) {
                winner = payable(player);
                break;
            }
        }

        require(
            winner != address(0),
            "Winner selection failed"
        );

        // ---------------------------------------------------------
        // CALCULATE WINNER REWARD
        //
        // P_i = winnerContribution / totalPot
        //
        // reward =
        //     winnerContribution * (1 + P_i)
        //
        // capped at totalPot.
        // ---------------------------------------------------------

        uint256 winnerContribution =
            round.contribution[winner];

        uint256 calculatedReward =
            winnerContribution +
            (
                winnerContribution *
                winnerContribution /
                totalPot
            );

        uint256 winnerPrize;

        if (calculatedReward > totalPot) {
            winnerPrize = totalPot;
        } else {
            winnerPrize = calculatedReward;
        }

        // ---------------------------------------------------------
        // ORGANIZER GETS REMAINING POT
        // ---------------------------------------------------------

        uint256 organizerShare =
            totalPot - winnerPrize;

        round.winner = winner;

        round.settled = true;

        // ---------------------------------------------------------
        // PAY WINNER
        // ---------------------------------------------------------

        (
            bool winnerSuccess,
            bytes memory winnerData
        ) = winner.call{
            value: winnerPrize
        }("");

        winnerData;

        require(
            winnerSuccess,
            "Winner payment failed"
        );

        // ---------------------------------------------------------
        // PAY ORGANIZER
        // ---------------------------------------------------------

        if (organizerShare > 0) {
            (
                bool organizerSuccess,
                bytes memory organizerData
            ) = organizer.call{
                value: organizerShare
            }("");

            organizerData;

            require(
                organizerSuccess,
                "Organizer payment failed"
            );
        }

        emit WinnerSelected(
            currentRound,
            winner,
            winnerContribution,
            winnerContribution,
            totalPot,
            calculatedReward,
            winnerPrize,
            organizerShare
        );

        // ---------------------------------------------------------
        // PREPARE NEXT ROUND
        // ---------------------------------------------------------

        _prepareNextRound();
    }

    // =============================================================
    // PLAYER FUNCTION
    // =============================================================

    /**
     * @notice Enter the currently active lottery round.
     *
     * A player may contribute any amount >= minimumContribution.
     *
     * Each address may enter only once per round.
     *
     * The contribution determines the player's winning probability.
     */
    function enter()
        external
        payable
        nonReentrant
    {
        require(
            roundActive,
            "Lottery round is not active"
        );

        require(
            msg.sender != organizer,
            "Organizer cannot enter the lottery"
        );

        require(
            msg.value >= minimumContribution,
            "Contribution is below minimum"
        );

        Round storage round = rounds[currentRound];

        require(
            !round.entered[msg.sender],
            "You already entered this round"
        );

        round.entered[msg.sender] = true;

        round.contribution[msg.sender] =
            msg.value;

        round.players.push(msg.sender);

        round.totalPot += msg.value;

        emit PlayerEntered(
            currentRound,
            msg.sender,
            msg.value
        );
    }

    // =============================================================
    // INTERNAL ROUND MANAGEMENT
    // =============================================================

    function _prepareNextRound()
        internal
    {
        currentRound++;

        roundActive = false;

        roundStartTime = 0;

        roundEndTime = 0;

        Round storage newRound =
            rounds[currentRound];

        newRound.startTime = 0;

        newRound.endTime = 0;

        newRound.totalPot = 0;

        newRound.settled = false;

        newRound.winner = address(0);
    }

    // =============================================================
    // VIEW FUNCTIONS
    // =============================================================

    function getCurrentRoundInfo()
        external
        view
        returns (
            uint256 roundId,
            bool active,
            uint256 startTime,
            uint256 endTime,
            uint256 totalPot,
            uint256 playerCount,
            bool settled,
            address winner
        )
    {
        Round storage round =
            rounds[currentRound];

        return (
            currentRound,
            roundActive,
            round.startTime,
            round.endTime,
            round.totalPot,
            round.players.length,
            round.settled,
            round.winner
        );
    }

    function getRoundInfo(
        uint256 roundId
    )
        external
        view
        returns (
            uint256 startTime,
            uint256 endTime,
            uint256 totalPot,
            bool settled,
            address winner,
            uint256 playerCount
        )
    {
        Round storage round =
            rounds[roundId];

        return (
            round.startTime,
            round.endTime,
            round.totalPot,
            round.settled,
            round.winner,
            round.players.length
        );
    }

    function getPlayers(
        uint256 roundId
    )
        external
        view
        returns (
            address[] memory
        )
    {
        return rounds[roundId].players;
    }

    function getContribution(
        uint256 roundId,
        address player
    )
        external
        view
        returns (
            uint256
        )
    {
        return rounds[roundId]
            .contribution[player];
    }

    function hasEntered(
        uint256 roundId,
        address player
    )
        external
        view
        returns (
            bool
        )
    {
        return rounds[roundId]
            .entered[player];
    }

    /**
     * @notice Returns the player's weighted winning probability
     * expressed as a percentage with 18 decimal precision.
     *
     * Example:
     * 30% = 300000000000000000
     */
    function getWinningProbability(
        uint256 roundId,
        address player
    )
        external
        view
        returns (
            uint256
        )
    {
        Round storage round =
            rounds[roundId];

        if (round.totalPot == 0) {
            return 0;
        }

        return (
            round.contribution[player]
            * 1e18
            / round.totalPot
        );
    }

    /**
     * @notice Calculates the reward according to:
     *
     * reward = min(
     *     contribution * (1 + probability),
     *     totalPot
     * )
     */
    function calculatePotentialReward(
        uint256 roundId,
        address player
    )
        external
        view
        returns (
            uint256
        )
    {
        Round storage round =
            rounds[roundId];

        uint256 contribution =
            round.contribution[player];

        if (
            contribution == 0 ||
            round.totalPot == 0
        ) {
            return 0;
        }

        uint256 calculatedReward =
            contribution +
            (
                contribution *
                contribution /
                round.totalPot
            );

        if (
            calculatedReward > round.totalPot
        ) {
            return round.totalPot;
        }

        return calculatedReward;
    }

    function getContractBalance()
        external
        view
        returns (
            uint256
        )
    {
        return address(this).balance;
    }

    function getMinimumContribution()
        external
        view
        returns (
            uint256
        )
    {
        return minimumContribution;
    }

    // =============================================================
    // RECEIVE / FALLBACK
    // =============================================================

    receive()
        external
        payable
    {
        revert(
            "Use the Enter Lottery button"
        );
    }

    fallback()
        external
        payable
    {
        revert(
            "Invalid function"
        );
    }
}