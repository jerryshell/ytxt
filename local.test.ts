import { fetchTranscript } from "youtube-transcript-plus";
fetchTranscript("https://www.youtube.com/watch?v=UF8uR6Z6KLc", { lang: "en" })
  .then(console.log)
  .catch(console.error);
// [ { text: "...", duration: 7.39, offset: 1.57, lang: "en", }, ...]
