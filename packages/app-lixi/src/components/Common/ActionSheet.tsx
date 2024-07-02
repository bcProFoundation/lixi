import { getActionSheet } from '@store/action-sheet/selectors';
import { useSliceSelector } from '@store/index';
import { getCurrentThemes } from '@store/settings';
import { ConfigProvider } from 'antd';
import _ from 'lodash';
import darkTheme from 'src/styles/themes/darkTheme';
import lightTheme from 'src/styles/themes/lightTheme';
import { InstallPwaGuide } from './InstallPwaGuide';
import { PostActionSheet } from './PostActionSheet';

const actionSheetComponentLookupTable = {
  PostActionSheet,
  InstallPwaGuide
};

const ActionSheet = () => {
  const currentActionSheet = useSliceSelector(getActionSheet);
  const currentTheme = useSliceSelector(getCurrentThemes);

  const renderedActionSheet = currentActionSheet.map((actionSheetDescription, index) => {
    const { actionSheetType, actionSheetProps = {} } = actionSheetDescription;
    const actionSheetPropsClone = _.cloneDeep(actionSheetProps);
    actionSheetPropsClone['classStyle'] = currentTheme === 'dark' ? 'action-sheet-dark' : '';
    let newActionSheetProps = { ...actionSheetPropsClone };
    const DrawerComponent = actionSheetComponentLookupTable[actionSheetType];

    return (
      <ConfigProvider theme={currentTheme === 'dark' ? darkTheme : lightTheme} key={`theme-${currentTheme}`}>
        <DrawerComponent {...newActionSheetProps} key={actionSheetType + index} />
      </ConfigProvider>
    );
  });

  return <>{renderedActionSheet}</>;
};

export default ActionSheet;
