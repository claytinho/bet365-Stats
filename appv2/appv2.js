const fs = require("fs");
const axios = require("axios").default;
const statisticsApi = "../assets/api/data.json";
const urlsApi = "../assets/api/url.json";

const callMockApi = (address, options) => JSON.parse(fs.readFileSync(address));

const callApi = async (options) =>
  axios
    .request(options)
    .then((data) => data)
    .catch((error) => console.log(error));

const bet365Signals = () => {
  const gamesInPlay = callMockApi(statisticsApi, "");
  const gamesStatistics = getGamesStatistics(gamesInPlay.data);
  const gamesToBet = filterGamesByStatistics(gamesStatistics);

  const gamesUrls = callMockApi(urlsApi, "");
  const gamesToBetUrls = searchUrl(
    gamesStatistics,
    Object.values(gamesUrls.data)
  );

  // console.log(gamesUrls.data);
};

const getGamesStatistics = (stats) => {
  const allGames = stats.result;
  const liveGames = allGames.filter((game) => game.in_play);
  return liveGames.map((game) => ({
    game: {
      id: game.id,
      timer: parseInt(game.timer),
      championship: game.championship.name,
      url: "",
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
    if ((appmHome > 1 && scoreHome < 1) || (appmAway > 1 && scoreAway < 1))
      return true;
  });

const filterChanceGoal = (arr) =>
  arr.filter((funnel) => {
    const cgHome =
      parseInt(funnel.home.shootsTotal) + parseInt(funnel.home.cornersTotal);
    const cgAway =
      parseInt(funnel.away.shootsTotal) + parseInt(funnel.away.cornersTotal);
    if (
      (funnel.game.timer < 30 && (cgHome >= 5 || cgAway >= 5)) ||
      (funnel.game.timer >= 30 &&
        funnel.game.timer < 45 &&
        (cgHome >= 10 || cgAway >= 10)) ||
      (funnel.game.timer > 70 && (cgHome >= 1 || cgAway >= 1))
    )
      return true;
    return false;
  });

const searchUrl = (arrGames, arrUrls) => {
  const arrayWithUrl = arrGames.filter((game, arrUrls) => {
    if (game.home.name == arrUrls.homeTeam) return true;
    return false;
  });
  console.log(arrayWithUrl);
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
    .then((texto) => console.log(texto))
    .catch((error) => console.log(error));

bet365Signals();
