module.exports = api => {
    api.cache(true);
    return {
        presets: [
            'next/babel'
        ],
        plugins: [
            '@babel/plugin-transform-modules-commonjs',
            ['@babel/plugin-proposal-decorators', { decoratorsBeforeExport: true, legacy: false }]
        ]
    };
};
