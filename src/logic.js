// Dotenv
require('dotenv').config()

// node-persist
const storage = require('node-persist');
storage.init()

// Twilio
const twilio = require('twilio')();

// Settings
const UPDATE_FREQUENCY = 10 // Every 10 games, send an upate

function info() {
    console.log("INFO")
    const response = {
        apiversion: "1",
        author: "",
        color: "#888888",
        head: "default",
        tail: "default"
    }
    return response
}

function start(gameState) {
    console.log(`${gameState.game.id} START`)
}

async function end(gameState) {
    console.log(`${gameState.game.id} END\n`)
    // Parse the results
    let winnerName = false
    let won = false
    if (gameState.board.snakes.length !== 0) {
        const winningSnake = gameState.board.snakes[0]
        winnerName = gameState.board.snakes[0].name
        if (winningSnake.id === gameState.you.id) {
            won = true
        }
    }
    // Save the results to storage
    let games = []
    try {
        games = await storage.getItem('games')
    } catch (err) {
        console.error('failed to load games')
    }
    games.push({
        winnerName,
        won
    })
    await storage.setItem('games', games)
    // If we have enough results
    if (games.length % UPDATE_FREQUENCY === 0) {
        await sendSummary(games)
    }
}

async function sendSummary(games) {
    // Prepare a summary
    const gamesWon = games.filter(g => g.won)
    const gamesLost = games.filter(g => !g.won)
    const winPercent = Math.floor(gamesWon.length / games.length * 100)
    
    // Prep the SMS
    const from = process.env.FROM_NUMBER
    const to = process.env.TO_NUMBER
    // First, show the win rate
    let body = `After ${games.length} games, you have ${gamesWon.length} wins for rate of ${winPercent}%`

    // Next, find the people who defeated me the most
    const winnersNames = gamesLost.map((game) => game.winnerName)
    const rankedWinners = winnersNames.sort((a, b) => {
        winnersNames.filter(w => w === a).length - winnersNames.filter(w => w === b).length
    })
    const highestWinner = rankedWinners[0]
    const highestWinnerCount = rankedWinners.filter(w => w === highestWinner).length
    body += `\nYou lost the most to ${highestWinner} (${highestWinnerCount} times)`

    // Send the SMS
    twilio.messages.create({
        from,
        to,
        body
    })
}

function move(gameState) {
    let possibleMoves = {
        up: true,
        down: true,
        left: true,
        right: true
    }

    // Step 0: Don't let your Battlesnake move back on its own neck
    const myHead = gameState.you.head
    const myNeck = gameState.you.body[1]
    if (myNeck.x < myHead.x) {
        possibleMoves.left = false
    } else if (myNeck.x > myHead.x) {
        possibleMoves.right = false
    } else if (myNeck.y < myHead.y) {
        possibleMoves.down = false
    } else if (myNeck.y > myHead.y) {
        possibleMoves.up = false
    }

    // TODO: Step 1 - Don't hit walls.
    // Use information in gameState to prevent your Battlesnake from moving beyond the boundaries of the board.
    // const boardWidth = gameState.board.width
    // const boardHeight = gameState.board.height

    // TODO: Step 2 - Don't hit yourself.
    // Use information in gameState to prevent your Battlesnake from colliding with itself.
    // const mybody = gameState.you.body

    // TODO: Step 3 - Don't collide with others.
    // Use information in gameState to prevent your Battlesnake from colliding with others.

    // TODO: Step 4 - Find food.
    // Use information in gameState to seek out and find food.

    // Finally, choose a move from the available safe moves.
    // TODO: Step 5 - Select a move to make based on strategy, rather than random.
    const safeMoves = Object.keys(possibleMoves).filter(key => possibleMoves[key])
    const response = {
        move: safeMoves[Math.floor(Math.random() * safeMoves.length)],
    }

    console.log(`${gameState.game.id} MOVE ${gameState.turn}: ${response.move}`)
    return response
}

module.exports = {
    info: info,
    start: start,
    move: move,
    end: end
}
