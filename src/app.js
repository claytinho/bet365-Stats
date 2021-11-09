const axios = require("axios").default;

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

const callApi = async (options) => axios.request(options);

const api = () => {
  setInterval(async () => {
    const response = await callApi(apiSoccerFootball);
    getFunnels(response.data);
  }, 600000);
};

const objArray = [
  {
    home: String,
    apmHome: Number,
    cogHome: Number,
    away: String,
    apmAway: Number,
    cogAway: Number,
    urlBet: String,
    time: String,
    goalsA: Number,
    goalsB: Number,
  },
];

const getFunnels = async (a) => {
  objArray.splice(0, objArray.length);

  for (var i = 0; i < a.result.length; i++) {
    const atacksTeamA =
      parseInt(a.result[i].teamA.stats.attacks.d) / parseInt(a.result[i].timer);
    const atacksTeamB =
      parseInt(a.result[i].teamB.stats.attacks.d) / parseInt(a.result[i].timer);

    const cogTeamA =
      parseInt(a.result[i].teamA.stats.shoots.on) +
      parseInt(a.result[i].teamA.stats.shoots.off) +
      parseInt(a.result[i].teamA.stats.corners.t);
    const cogTeamB =
      parseInt(a.result[i].teamB.stats.shoots.on) +
      parseInt(a.result[i].teamB.stats.shoots.off) +
      parseInt(a.result[i].teamB.stats.corners.t);

    const timing = parseInt(a.result[i].timer);
    const goalsTeamA = a.result[i].teamA.score.f;
    const goalsTeamB = a.result[i].teamB.score.f;
    const goalsCap = goalsTeamA - goalsTeamB;
    if (
      ((atacksTeamA >= 1 && cogTeamA >= 15) ||
        (atacksTeamB >= 1 && cogTeamB >= 15)) &&
      ((timing >= 30 && timing < 45) || (timing >= 70 && timing < 90)) &&
      goalsCap >= -1 &&
      goalsCap <= 1
    ) {
      objArray.push({
        home: a.result[i].teamA.name,
        apmHome: atacksTeamA,
        cogHome: cogTeamA,
        goalsA: goalsTeamA,
        away: a.result[i].teamB.name,
        apmAway: atacksTeamB,
        cogAway: cogTeamB,
        goalsB: goalsTeamB,

        urlBet: " Link não encontrado!",
        time: timing,
      });
    } else {
      console.log("jogo" + i + "fora do funil");
    }
  }
  callTelegram();
};

const callTelegram = async () => {
  for (var i = 0; i < objArray.length; i++) {
    await searchUrl(i);

    let texto = `${objArray[i].home} - APPM: ${objArray[i].apmHome.toFixed(
      2
    )} COG: ${objArray[i].cogHome.toFixed(2)} Time: ${
      objArray[i].time
    } Goals: ${objArray[i].goalsA} | ${objArray[i].away} - APPM: ${objArray[
      i
    ].apmAway.toFixed(2)} COG: ${objArray[i].cogAway.toFixed(2)} Goals: ${
      objArray[i].goalsB
    } LINK: https://www.bet365.com${objArray[i].urlBet} `;

    sendMsg(texto);
  }
};

const searchUrl = async (i) => {
  const response = await callApi(apiBet365);
  const arr = Object.values(response.data);
  for (var x = 0; x < arr.length; x++) {
    if (
      arr[x].homeTeam == objArray[i].home &&
      arr[x].awayTeam == objArray[i].away
    ) {
      objArray[i].urlBet = arr[x].url;
    }
  }
};

const sendMsg = (texto) => {
  axios.post(
    `https://api.telegram.org/bot2085996950:AAHlZUWxf7CU6qBTFvs_PcoXEPF8-flTKSw/sendmessage`,
    (params = {
      chat_id: "-522339496",
      text: texto,
    })
  );
  console.log(texto);
};

api();
