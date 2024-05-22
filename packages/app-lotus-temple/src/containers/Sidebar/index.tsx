import React, { useState } from 'react';
import { Drawer } from 'antd';
import { useSliceDispatch, useSliceSelector } from '@store/index';
import { toggleCollapsedSideNav } from '@store/settings/actions';
import { getNavCollapsed } from '@store/settings/selectors';
import SidebarShortcut from './SideBarShortcut';
import styled from 'styled-components';

export type SidebarProps = {
  className?: string;
};

const StyledDrawer = styled(Drawer)`
  width: 320px !important;

  .ant-drawer-body {
    padding: 0px !important;
  }

  @media (max-width: 600px) {
    width: 100vw !important;
  }
`;

const Sidebar = ({ className }: SidebarProps) => {
  const dispatch = useSliceDispatch();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navCollapsed = useSliceSelector(getNavCollapsed);

  const onToggleCollapsedNav = () => {
    dispatch(toggleCollapsedSideNav(!navCollapsed));
  };

  return (
    <StyledDrawer
      rootStyle={{ position: 'absolute' }}
      className={`${className} lixi-drawer-sidebar`}
      placement="right"
      closable={false}
      onClose={onToggleCollapsedNav}
      getContainer={false}
      open={!navCollapsed}
    >
      <SidebarShortcut sidebarCollapsed={sidebarCollapsed} setSidebarCollapsed={setSidebarCollapsed} />
    </StyledDrawer>
  );
};

export default Sidebar;
