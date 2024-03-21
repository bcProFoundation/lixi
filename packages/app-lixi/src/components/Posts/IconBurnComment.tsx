import { useState } from 'react';

type IconBurnCommentProps = {
  isUp: boolean;
};

const IconBurnComment = ({ isUp }: IconBurnCommentProps) => {
  const [isHoverIconBurn, setIsHoverIconBurn] = useState<boolean>(false);
  return (
    <div
      style={{
        padding: '2px',
        borderRadius: '20px',
        backgroundColor: isHoverIconBurn ? (isUp ? '#00abe7' : 'var(--color-danger)') : '#fff'
      }}
      onMouseOver={() => {
        setIsHoverIconBurn(true);
      }}
      onMouseOut={() => {
        setIsHoverIconBurn(false);
      }}
    >
      <img
        src={`/images/${isUp ? 'up' : 'down'}-arrow.svg`}
        style={{ filter: isHoverIconBurn ? 'var(--filter-svg-white-color)' : 'var(--filter-svg-gray-color)' }}
        width={`18px`}
      />
    </div>
  );
};

export default IconBurnComment;
