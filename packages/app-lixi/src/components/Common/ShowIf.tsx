import * as React from 'react';

export interface ShowIfProps extends React.PropsWithChildren {
  condition: boolean;
}

/**
 * Shows the child nodes if the supplied condition is true
 */
const ShowIf: React.FC<ShowIfProps> = ({ condition, children }) => <>{(condition && children) || null}</>;

export default ShowIf;
