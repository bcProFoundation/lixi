module.exports = api => {
    return {
        presets: [
            ['@babel/preset-env', { targets: { node: 'current' } }],
            '@babel/preset-typescript',
        ],
        plugins: [
            "babel-plugin-styled-components",
            "@babel/plugin-transform-modules-commonjs"
        ]
    };
};
