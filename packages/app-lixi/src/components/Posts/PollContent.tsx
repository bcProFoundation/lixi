import { CreateVoteInput } from '@bcpros/lixi-models';
import { PollTime } from '@bcpros/lixi-models/constants';
import { PollQueryItem } from '@generated/types';
import { getSelectedAccount, getSelectedAccountId } from '@store/account';
import { useGetAccountByAddressQuery } from '@store/account/accounts.api';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { useCreateVoteMutation } from '@store/post/polls.api';
import { showToast } from '@store/toast';
import { timeLeft } from '@utils/timeLeft';
import { Button, Radio } from 'antd';
import React, { Fragment, useState } from 'react';
import intl from 'react-intl-universal';
import styled from 'styled-components';

const PollWrapper = styled.div`
  border: 1px solid black;
  border-radius: 5px;
  width: 70%;
  margin: 0 auto;
  padding: 10px;
  cursor: auto;

  .poll-question {
    font-size: 1.2rem;
    margin-bottom: 5px;
  }
  .poll__vote-closeTime {
    display: flex;
    gap: 5px;
    font-size: 0.7rem;
    margin-bottom: 0.5rem;
  }
  .poll-options {
    display: flex;
    flex-direction: column;
  }
  .radio-option {
    border: 1px solid #ced0d4;
    border-radius: 5px;
    margin-bottom: 5px;
    padding: 10px;
    background: transparent;
    font-weight: 500;
    z-index: 1;
    position: relative;
    .option-percentage {
      position: absolute;
      right: 10px;
      transform: translateY(-100%);
      color: #0064d1;
      font-size: 0.8rem;
    }
  }

  .percentage-bar {
    position: absolute;
    top: 0;
    left: 0;
    border-radius: 4px;
    background-color: #e7f3ff;
    height: 100%;
    z-index: -1;
    transition: width 300ms ease-in-out;
  }

  .action-bar-poll {
    display: flex;
    justify-content: space-between;
    padding-right: 8px;
    margin-top: 5px;
    .btn-action:hover {
      opacity: 0.9;
    }
  }
`;

type PollContentProps = {
  poll: PollQueryItem;
};

const PollContent = ({ poll }: PollContentProps) => {
  const dispatch = useAppDispatch();
  const selectedAccountId = useAppSelector(getSelectedAccountId);
  const selectedAccount = useAppSelector(getSelectedAccount);
  const [options, setOptions] = useState(poll.options);
  const [currentOption, setCurrentOption] = useState(null);
  const defaultOptions = poll?.defaultOptions && poll.defaultOptions;
  const deadline = timeLeft(poll.endDate);

  //get account dana
  const currentAccount = useGetAccountByAddressQuery(
    { address: selectedAccount?.address || '' },
    { skip: !selectedAccount?.address }
  );

  const totalDanaPoll = poll.options?.reduce((accumulate, cur) => accumulate + cur.danaScoreOption, 0) ?? 0;

  const [createVoteTrigger] = useCreateVoteMutation();

  const handleOnChangePoll = item => {
    setCurrentOption(item);
  };

  //TODO
  const handleAddOption = () => {
    console.log('add option');
    // setOptions(pre => [...pre, { newOption: 'newoption' }]);
  };

  const handleVote = async currentOption => {
    if (!currentOption || deadline === PollTime.closePoll) return;

    if (currentAccount.data.getAccountByAddress.accountDana.danaGiven === 0) {
      dispatch(
        showToast('warning', {
          message: intl.get('toast.warning'),
          description: intl.get('poll.requireDana'),
          duration: 5
        })
      );
      return;
    }

    const createVoteInput: CreateVoteInput = {
      accountId: selectedAccountId,
      optionId: currentOption.id,
      previousOptionIds: defaultOptions,
      singleSelect: poll.singleSelect,
      pollId: poll.postId
    };
    await createVoteTrigger({ input: createVoteInput });
  };

  return (
    <Fragment>
      <PollWrapper className="poll-wrapper">
        <div className="poll-question">{poll.question}</div>
        <div className="poll__vote-closeTime">
          <div className="vote-number">{poll.totalVote} vote</div> - <div className="close-time">{deadline}</div>
        </div>
        <Radio.Group defaultValue={defaultOptions && defaultOptions[0]} className="poll-options">
          {poll?.options.map(item => {
            const calculatePercentage = ((item.danaScoreOption / totalDanaPoll) * 100).toFixed(0);
            const checkCalculate = calculatePercentage === 'NaN' ? 0 : calculatePercentage;

            return (
              <Radio
                className="radio-option"
                onChange={() => handleOnChangePoll(item)}
                value={item.id}
                key={`poll-option-${item.id}`}
              >
                <span className="option-title">{item.option}</span>
                <div className="option-percentage">{checkCalculate}%</div>
                {/* <div className="percentage-bar"></div> */}
              </Radio>
            );
          })}
        </Radio.Group>
        <div className="action-bar-poll">
          {poll.canAddOption && (
            <Button className="btn-action" type="primary" onClick={handleAddOption}>
              {intl.get('poll.addOption')}
            </Button>
          )}
          <Button
            disabled={deadline === PollTime.closePoll}
            className="btn-action"
            type="primary"
            onClick={() => handleVote(currentOption)}
          >
            {intl.get('poll.vote')}
          </Button>
        </div>
      </PollWrapper>
    </Fragment>
  );
};

export default React.memo(PollContent);
