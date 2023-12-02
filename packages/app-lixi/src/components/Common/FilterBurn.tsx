import React, { useEffect } from 'react';
import { Button, Checkbox, Input } from 'antd';
import { FilterType } from '@bcpros/lixi-models/lib/filter';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { saveMinimumDanaFilter, setNegativeDanaStatus } from '@store/settings/actions';
import styled from 'styled-components';
import intl from 'react-intl-universal';
import { getMinimumDanaFilter, getNegativeDanaStatus } from '@store/settings/selectors';
import { MinusOutlined, PlusOutlined } from '@ant-design/icons';
import 'animate.css';
import { CheckboxChangeEvent } from 'antd/es/checkbox';
import { getAccountInfoTemp, getSelectedAccount } from '@store/account';
import _ from 'lodash';

const FilterStyle = styled.div`
  display: flex;
  align-items: baseline;
  gap: 4px;
  p {
    margin: 0;
    font-weight: 500;
  }

  .ant-input-group {
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    align-items: center;
    gap: 4px;

    Button {
      &.down-value {
        border: 0.1px solid;
        border-radius: 50%;
        color: rgba(30, 26, 29, 0.6);
      }
      &.down-value:hover {
        border: 1.3px solid #9e2a9c;
      }
      &.up-value {
        border: 0.1px solid;
        border-radius: 50%;
        color: rgba(30, 26, 29, 0.6);
      }
      &.up-value:hover {
        border: 1.3px solid #9e2a9c;
      }
    }
    .ant-input-disabled {
      width: 70px;
      color: #000;
      cursor: pointer;
      border: 0px;
      background: rgba(0, 0, 0, 0);
      padding: 0;
      text-align: center;
    }
  }
`;

const FilterContainer = styled.div``;

type FilterBurntProps = {
  filterType: FilterType;
};

export const FilterBurnt = ({ filterType }: FilterBurntProps) => {
  const dispatch = useAppDispatch();
  const selectedAccount = useAppSelector(getAccountInfoTemp);
  const minimumDanaFilter = useAppSelector(getMinimumDanaFilter);
  const negativeDanaStatus = useAppSelector(getNegativeDanaStatus);

  const handleChangeAmount = (isIncrement: boolean) => {
    let valueToSave = 0;
    if (isIncrement) {
      valueToSave = minimumDanaFilter === 0 ? 1 : minimumDanaFilter * 10;
    } else {
      valueToSave = minimumDanaFilter < 10 ? 0 : minimumDanaFilter / 10;
    }

    if (valueToSave > 0) dispatch(setNegativeDanaStatus(false));

    dispatch(saveMinimumDanaFilter(valueToSave));
  };

  const onChange = (e: CheckboxChangeEvent) => {
    dispatch(setNegativeDanaStatus(e.target.checked));
  };

  useEffect(() => {
    if (_.isNil(minimumDanaFilter)) {
      dispatch(saveMinimumDanaFilter(0));
    }
  }, [minimumDanaFilter]);

  return (
    <React.Fragment>
      <FilterContainer>
        <FilterStyle>
          <p>{intl.get('general.level')}: </p>
          <Input.Group>
            <Button
              className="down-value"
              icon={<MinusOutlined />}
              onClick={() => handleChangeAmount(false)}
              disabled={minimumDanaFilter === 0}
            />
            <Input disabled value={minimumDanaFilter !== 0 ? minimumDanaFilter + intl.get('general.dana') : 'None'} />
            <Button
              className="up-value"
              icon={<PlusOutlined />}
              onClick={() => handleChangeAmount(true)}
              disabled={minimumDanaFilter === 1000}
            />
            {selectedAccount?.accountDana?.danaGiven > 0 && (
              <Checkbox onChange={onChange} checked={negativeDanaStatus} disabled={minimumDanaFilter > 0}>
                Show Negative
              </Checkbox>
            )}
          </Input.Group>
        </FilterStyle>
      </FilterContainer>
    </React.Fragment>
  );
};
