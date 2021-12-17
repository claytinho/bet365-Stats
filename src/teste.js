const fs = require("fs");

const getGamesAlreadySent = () => {
  const data = fs
    .readFileSync("./assets/s3/games.txt", {
      encoding: "utf8",
      flag: "r",
    })
    .toString()
    .replace("\r", "")
    .split("\n");
  if (data[0].length == 0) return [];
  else return data.map((i) => JSON.parse(i));
};

const addGameToFile = (game) =>
  fs.appendFile(
    "./assets/s3/games.txt",
    "\n" + JSON.stringify(game),
    function (err) {
      if (err) throw err;
      console.log("Saved!");
    }
  );

const halfTime = 1;
const gameId = "8eb1cade4af545646841a6869";

const gamesAlreadySent = getGamesAlreadySent();
const foundGame = gamesAlreadySent.find(
  (game) => game.id == gameId && game.halftime == halfTime
);
console.log(foundGame);
if (foundGame) {
  console.log("achou o game " + foundGame.id);
} else {
  console.log("nao achou o game");
  addGameToFile({ id: gameId, halftime: halfTime });
}
