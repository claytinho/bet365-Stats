const fs = require("fs");
const axios = require("axios").default;
const statisticsApi = "./assets/api/data.json";
const urlsApi = "./assets/api/url.json";

// const callMockApi = (address, options) => JSON.parse(fs.readFileSync(address));

const apiSoccerFootball = {
  method: "GET",
  url: "https://soccer-football-info.p.rapidapi.com/live/full/",
  params: { l: "en_US" },
  headers: {
    "x-rapidapi-host": "soccer-football-info.p.rapidapi.com",
    "x-rapidapi-key": "cecaff6448msh119e5c30d75b37ep1d292ajsnadadb556e914",
  },
};

const apiBet365 = {
  method: "GET",
  url: "http://www.365api.vip/b365/soccer/test/allEv",
  params: { lang: "en" },
};

const callApi = async (options) =>
  axios
    .request(options)
    .then((data) => data)
    .catch((error) => console.log(error));

const bet365Signals = async () => {
  const gamesInPlay = await getGamesInPlay();
  const gamesStatistics = getGamesStatistics(gamesInPlay.data);
  const gamesToBet = filterGamesByStatistics(gamesStatistics);

  const gamesUrls = await getGamesUrls();
  const gamesToBetUrls = searchUrl(
    gamesStatistics,
    Object.values(gamesUrls.data)
  );
  const messages = gamesToBetUrls.map(createMessage);
  // messages.forEach((s) => console.log(s));

  await sendMessagesSerially(messages);
};

const getGamesInPlay = async () =>
  callApi(apiSoccerFootball).then((result) => result);

const getGamesUrls = async () =>
  callApi(apiBet365).then((result) => {
    return result;
  });

const getGamesStatistics = (stats) => {
  const allGames = stats.result;
  const liveGames = allGames.filter((game) => game.in_play);
  return liveGames.map((game) => ({
    game: {
      id: game.id,
      timer: parseInt(game.timer),
      championship: game.championship.name,
    },
    home: getStatisticsByTeam(game, "teamA"),
    away: getStatisticsByTeam(game, "teamB"),
    odds: {
      asianCornerValue: game.odds.live.asian_corner?.bet365?.v,
      asianCornerOdd: game.odds.live.asian_corner?.bet365?.o,
      goalOverValue: game.odds.live.over_under?.bet365?.v,
      goalOverOdd: game.odds.live.over_under?.bet365?.o,
    },
  }));
};

const getStatisticsByTeam = (game, teamName) => ({
  name: game[teamName].name,
  score: game[teamName].score.f,
  possession: game[teamName].stats.possession,
  attacksDangerous: game[teamName].stats.attacks.d,
  attacksNormals: game[teamName].stats.attacks.n,
  shootsTotal: game[teamName].stats.shoots.t,
  cornersTotal: game[teamName].stats.corners.t,

  percentGoalsScored1HT:
    parseInt(game[teamName].perf.goals_scored_0_15[1] || 0) +
    parseInt(game[teamName].perf.goals_scored_16_30[1] || 0) +
    parseInt(game[teamName].perf.goals_scored_31_45[1] || 0),
  percentGoalsScored2HT:
    parseInt(game[teamName].perf.goals_scored_46_60[1] || 0) +
    parseInt(game[teamName].perf.goals_scored_61_75[1] || 0) +
    parseInt(game[teamName].perf.goals_scored_76_90[1] || 0),
  percentGoalsConceded1HT:
    parseInt(game[teamName].perf.goals_conceded_0_15[1] || 0) +
    parseInt(game[teamName].perf.goals_conceded_16_30[1] || 0) +
    parseInt(game[teamName].perf.goals_conceded_31_45[1] || 0),
  percentGoalsConceded2HT:
    parseInt(game[teamName].perf.goals_conceded_46_60[1] || 0) +
    parseInt(game[teamName].perf.goals_conceded_61_75[1] || 0) +
    parseInt(game[teamName].perf.goals_conceded_76_90[1] || 0),
});

const filterGamesByStatistics = (statistics) => {
  const gamesWithAttacksDangerous = filterAttacksDangerous(statistics);
  return filterChanceGoal(gamesWithAttacksDangerous);
};

const filterAttacksDangerous = (arr) =>
  arr.filter((funnel) => {
    const appmHome = funnel.home.attacksDangerous / funnel.game.timer;
    const appmAway = funnel.away.attacksDangerous / funnel.game.timer;
    const scoreHome = funnel.home.score - funnel.away.score;
    const scoreAway = funnel.away.score - funnel.home.score;
    if (
      (appmHome > 0.2 && scoreHome < 0.2) ||
      (appmAway > 0.2 && scoreAway < 0.2)
    )
      return true;
  });

const filterChanceGoal = (arr) =>
  arr.filter((funnel) => {
    const cgHome =
      parseInt(funnel.home.shootsTotal) + parseInt(funnel.home.cornersTotal);
    const cgAway =
      parseInt(funnel.away.shootsTotal) + parseInt(funnel.away.cornersTotal);
    if (
      (funnel.game.timer < 30 && (cgHome >= 1 || cgAway >= 1)) ||
      (funnel.game.timer >= 30 &&
        funnel.game.timer < 45 &&
        (cgHome >= 1 || cgAway >= 1)) ||
      (funnel.game.timer > 70 && (cgHome >= 1 || cgAway >= 1))
    )
      return true;
    return false;
  });

const searchUrl = (games, arrUrls) => {
  const gamesWithUrl = games.map((game) => {
    const url = arrUrls.find((url) => url.homeTeam == game.home.name);
    game.game.url = url ? url.url : undefined;
    game.game.vs = url ? url.vsTeams : null;
    return game;
  });
  return gamesWithUrl;
};

const createMessage = (game) => {
  const championship = game.game.championship;
  const duel = game.game.vs;
  const home = game.home.name;
  const homeScore = game.home.score;
  const time = game.game.timer;
  const homeAppm = parseInt(game.home.attacksDangerous) / time;
  const homeCg =
    parseInt(game.home.shootsTotal) + parseInt(game.home.cornersTotal);
  const homeProbFazerGol1T = game.home.percentGoalsScored1HT;
  const homeProbFazerGol2T = game.home.percentGoalsScored2HT;
  const homeProbTomarGol1T = game.home.percentGoalsConceded1HT;
  const homeProbTomarGol2T = game.home.percentGoalsConceded2HT;

  const away = game.away.name;
  const awayScore = game.away.score;
  const awayAppm = parseInt(game.away.attacksDangerous) / time;
  const awayCg =
    parseInt(game.away.shootsTotal) + parseInt(game.away.cornersTotal);
  const awayProbFazerGol1T = game.away.percentGoalsScored1HT;
  const awayProbFazerGol2T = game.away.percentGoalsScored2HT;
  const awayProbTomarGol1T = game.away.percentGoalsConceded1HT;
  const awayProbTomarGol2T = game.away.percentGoalsConceded2HT;

  const cornerValue = game.odds.asianCornerValue ?? 0;
  const cornerOdd = game.odds.asianCornerOdd ?? 0;
  const overGoal = game.odds.goalOverValue ?? 0;
  const overOdd = game.odds.overOdd ?? 0;
  const linkMessage = game.game.url
    ? `LINK: https://www.bet365.com${game.game.url}`
    : "";
  const message = `${championship}
  ${duel}: ${time} minutos
  
  Casa: ${home} - ${homeScore} 
  ATQs Perigosos: ${homeAppm.toFixed(2)}
  Chances de Gol: ${homeCg}
  % para fazer gol 1T: ${homeProbFazerGol1T}%
  % para fazer gol 2T: ${homeProbFazerGol2T}%
  % para tomar gol 1T: ${homeProbTomarGol1T}%
  % para tomar gol 2T: ${homeProbTomarGol2T}%

  Visitante: ${away} - ${awayScore}
  ATQs Perigosos: ${awayAppm.toFixed(2)}
  Chances de Gol: ${awayCg}
  % para fazer gol 1T: ${awayProbFazerGol1T}%
  % para fazer gol 2T: ${awayProbFazerGol2T}%
  % para tomar gol 1T: ${awayProbTomarGol1T}%
  % para tomar gol 2T: ${awayProbTomarGol2T}%

  ODD
  Escanteio Asiatico: +${cornerValue} : ${cornerOdd}
  Gol: +${overGoal} : ${overOdd}

  ${linkMessage}
  `;

  return message;
};

const sendMessagesSerially = async (messages) => {
  for (let message of messages) {
    await sendMsg(message);
  }
};

const sendMsg = (texto) =>
  axios
    .post(
      `https://api.telegram.org/bot2085996950:AAHlZUWxf7CU6qBTFvs_PcoXEPF8-flTKSw/sendmessage`,
      (params = {
        chat_id: "-522339496",
        text: texto,
      })
    )
    .catch((error) => console.log(error));

// bet365Signals();

exports.handler = async (event) => {
  // TODO implement
  await bet365Signals();
  const response = {
    statusCode: 200,
    body: JSON.stringify("Hello from Lambda!"),
  };
  return response;
};
