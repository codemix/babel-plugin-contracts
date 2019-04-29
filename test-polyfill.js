require("@babel/register")({
  "presets": ["@babel/preset-env"],
  "plugins": [
    //"@babel/plugin-syntax-flow",
    "@babel/plugin-transform-flow-strip-types",
    "@babel/plugin-proposal-class-properties"
  ]
});
