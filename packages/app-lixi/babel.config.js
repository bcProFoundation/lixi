module.exports = api => {
    api.cache(true);
    return {
        presets: [
            'next/babel'
        ],
        plugins: [
            '@babel/plugin-transform-modules-commonjs',
            ['@babel/plugin-proposal-decorators', { decoratorsBeforeExport: true, legacy: false }],
            // If you also use antd icons, you can add a similar line for it:
            ['import', { libraryName: '@ant-design/icons', "customName": (name, file) => { } }]
        ]
    };
};
