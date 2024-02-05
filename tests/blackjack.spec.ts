import { Page, test, expect, request } from '@playwright/test';

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
    await page.goto("https://deckofcardsapi.com/");

    //check that page has been loaded
    expect(page.url() == "https://deckofcardsapi.com/");
    expect(await page.title() == "Deck of Cards API");
});

test('Play Blackjack', async ({ request }) => {
    //get a new deck of cards
    let deckRequest = await request.get("https://deckofcardsapi.com/api/deck/new/");
    expect(deckRequest.ok()).toBeTruthy();
    let json = await deckRequest.json();
    expect(json).toEqual(expect.objectContaining({
      success: true,
      shuffled: false,
      remaining: 52
    }));
    //keep deck id for later requests
    let deck_id = json.deck_id;

    //shuffle the deck
    deckRequest = await request.get("https://deckofcardsapi.com/api/deck/" + deck_id + "/shuffle/");
    expect(deckRequest.ok()).toBeTruthy();
    json = await deckRequest.json();
    expect(json).toEqual(expect.objectContaining({
        success: true,
        deck_id: deck_id,
        shuffled: true,
        remaining: 52
    }));

    //deal 3 cards to each of two players
    //draw six cards
    deckRequest = await request.get("https://deckofcardsapi.com/api/deck/" + deck_id + "/draw/?count=6");
    expect(deckRequest.ok()).toBeTruthy();
    json = await deckRequest.json();
    expect(json).toEqual(expect.objectContaining({
        success: true,
        deck_id: deck_id,
        remaining: 46
    }));
    //save drawn cards
    let cards = json.cards;
    //store first three drawn cards in pile "hand1", representing  player one's hand
    deckRequest = await request.get("https://deckofcardsapi.com/api/deck/" + deck_id + "/pile/" + "hand1" + "/add?cards="
    + cards[0].code + "," + cards[1].code + "," + cards[2].code);
    expect(deckRequest.ok()).toBeTruthy();
    json = await deckRequest.json();
    expect(json).toEqual(expect.objectContaining({
        success: true,
        deck_id: deck_id,
        remaining: 46,
        piles: {
            hand1: {
                remaining: 3
            }
        }
    }));
    //store next three drawn cards in pile "hand2", representing player two's hand
    deckRequest = await request.get("https://deckofcardsapi.com/api/deck/" + deck_id + "/pile/" + "hand2" + "/add?cards="
    + cards[3].code + "," + cards[4].code + "," + cards[5].code);
    expect(deckRequest.ok()).toBeTruthy();
    json = await deckRequest.json();
    expect(json).toEqual(expect.objectContaining({
        success: true,
        deck_id: deck_id,
        remaining: 46,
        piles: {
            hand1: {
                remaining: 3
            },
            hand2: {
                remaining: 3
            }
        }
    }));
    
    //check if either player has a blackjack
    for (let i = 0; i < 2; i++) {
        //get(list) the cards in the current player's hand(pile)
        deckRequest = await request.get("https://deckofcardsapi.com/api/deck/" + deck_id + "/pile/hand" + (i + 1) + "/list/");
        json = await deckRequest.json();
        let hand = json.piles['hand' + (i + 1).toString()];
        let sum = 0;
        for (let j = 0; j < 3; j++) {
            if (!isNaN(hand.cards[j].value)) {
                sum += Number(hand.cards[j].value);
            }
            /* aces are 1 or 11 in blackjack, whichever is better for the player - this will
            always calculate the ideal option*/
            else if (hand.cards[j].value == 'Ace'){
                if (sum < 21) {
                    sum += 11;
                } else {
                    sum -= 10;
                }
           } else {
                sum += 10;
           }
        }
        
        if (sum == 21) { console.log("Player " + (i + 1) + " has blackjack!"); }
    }
});