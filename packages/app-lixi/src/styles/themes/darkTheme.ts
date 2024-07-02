import type { ThemeConfig } from 'antd';

const darkTheme: ThemeConfig = {
  token: {
    colorPrimary: '#9e2a9c'
  },
  components: {
    Select: {
      colorText: '#fff',
      colorBgElevated: '#303031',
      controlItemBgHover: '#70818a61'
    }
  }
};

export default darkTheme;
