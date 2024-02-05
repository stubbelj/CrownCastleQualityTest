import { Page, test, expect } from '@playwright/test';

// https://playwright.dev/docs/test-parallel#serial-mode
// sequential, inter-dependant tests
test.describe.configure({ mode: 'serial' });

let page: Page;

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
});

test.afterAll(async () => {
  await page.close();
});

test('Site is up', async () => {
    //navigate to the page
    await page.goto("https://www.gamesforthebrain.com/game/checkers/");

    //check that page has been loaded
    expect(page.url() == "https://www.gamesforthebrain.com/game/checkers/");
    expect(await page.title() == "Checkers - Games for the Brain");
});

test('Make five legal moves as orange', async () => {
    //play five moves of checkers. this default set of moves gurantees that a blue piece will be taken.
    let forcedMoves = [[4, 2, 3, 3], [2, 2, 1, 3], [3, 1, 1, 3]];
    /*play numMoves moves of checkers, using provided moves if any exist*/
    //populate board with source image names
    let board = [["", "", "", "", "", "", "", ""], ["", "", "", "", "", "", "", ""], ["", "", "", "", "", "", "", ""], ["", "", "", "", "", "", "", ""], ["", "", "", "", "", "", "", ""], ["", "", "", "", "", "", "", ""], ["", "", "", "", "", "", "", ""], ["", "", "", "", "", "", "", ""]];
    await updateBoard(page, board);

    for (let i = 0; i < 5; i++) {
        if (i < forcedMoves.length && forcedMoves[i].length == 4) {
            await playMove(page, board, forcedMoves[i]);
        } else {
            await playMove(page, board);
        }
        await updateBoard(page, board);
    }
});

test('Restart the page', async () => {
    //restart page
    let restartButton = await page.getByText("Restart...");
    restartButton.click();

    //check that page has been restarted
    let message = page.locator("[id='message']");
    await expect(message).toHaveText("Select an orange piece to move.");
});

async function playMove(page, board, move=[0]) {
    /*if a move is provided, play it. otherwise, play a move with the following rules:
    if a piece can be taken, take it
    else, play a random valid move*/

    //if no move was provided, find a move
    if (move.length != 4) {
        let takeFlag = false;
        //sample indices in a random order, resulting a random move being selected
        let xRandomIndices = [0, 1, 2, 3, 4, 5, 6, 7].sort(() => Math.random() - 0.5);
        for (let i = 0; i < 8; i++) {
            let x = xRandomIndices[i];
            //sample indices in a random order, resulting a random move being selected
            let yRandomIndices = [0, 1, 2, 3, 4, 5, 6, 7].sort(() => Math.random() - 0.5);
            for (let j = 0; j < 8; j++) {
                let y = yRandomIndices[j];
                let cell = page.locator("[name='space" + x + y + "']");
                let cellValue = await cell.getAttribute("src");
                //if this is an owned cell, look for a possible move for that piece
                if (cellValue == "you1.gif") {
                    if (y < 7) {
                        if (y < 6) {
                            //if a piece can be taken
                            if (x > 1 && board[x - 1][y + 1] == "me1.gif" && board[x - 2][y + 2] == "gray.gif") {
                                move = [x, y, x - 2, y + 2];
                                takeFlag = true;
                                break;
                            } else if (x < 6 && board[x + 1][y + 1] == "me1.gif" && board[x + 2][y + 2] == "gray.gif") {
                                move = [x, y, x + 2, y + 2];
                                takeFlag = true;
                                break;
                            }
                        }
                        //if any valid move exists
                        if (x > 1) {
                            if(board[x - 1][y + 1] == "gray.gif") {
                                move = [x, y, x - 1, y + 1];
                                break;
                            }
                        } else if (x < 7) {
                            if (board[x + 1][y + 1] == "gray.gif") {
                                move = [x, y, x + 1, y + 1];
                                break;
                            }
                        }
                    }
                }
            }
            //if an optimal move has been selected, exit loop
            if (takeFlag == true) { break; }
        }
    }
    //play move
    let cell = await page.locator("[name='space" + move[0] + move[1] +  "']");
    await expect(cell).toHaveAttribute("src", "you1.gif");
    await page.waitForTimeout(1000);
    await cell.click();
    cell = await page.locator("[name='space" + move[2] + move[3] + "']");
    await page.waitForTimeout(1000);
    await cell.click();
    await page.waitForTimeout(1000);
    //await expect(cell).toHaveAttribute("src", "you1.gif");

    //await "Make a move." message
    let message = await page.locator("[id='message']");
    await expect(message).toContainText("Make a move.");
}

async function updateBoard(page, board) {
    for (let x = 0; x < 8; x++) {
        for (let y = 0; y < 8; y++) {
            let cell = await page.locator("[name='space" + x + y + "']");
            board[x][y] = await cell.getAttribute("src");
        }
    }
}