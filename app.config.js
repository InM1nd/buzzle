// Extends app.json. BZZ_WEB_BASE sets the web base path for hosting under a sub-path
// (GitHub Pages: /buzzle). Native builds and the local screenshot harness leave it unset.
module.exports = ({ config }) => {
  const base = process.env.BZZ_WEB_BASE;
  if (!base) return config;
  return { ...config, experiments: { ...(config.experiments || {}), baseUrl: base } };
};
