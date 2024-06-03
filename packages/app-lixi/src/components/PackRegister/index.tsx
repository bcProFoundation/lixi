import { CashLoadingIcon } from '@bcpros/lixi-components/components/Common/CustomIcons';
import {
  FormItemClaimCodeXpiInput,
  FormItemRegistrantAddressInput
} from '@bcpros/lixi-components/components/Common/EnhancedInputs';
import PrimaryButton from '@bcpros/lixi-components/components/Common/PrimaryButton';
import { Account, RegisterLixiPackCommand } from '@bcpros/lixi-models';
import { WrapperPage } from '@components/Settings';
import { getSelectedAccount } from '@store/account/selectors';
import { useSliceDispatch, useSliceSelector } from '@store/index';
import { registerLixiPack } from '@store/lixi/actions';
import { getIsGlobalLoading } from '@store/loading/selectors';
import { Col, Form, Row, Spin } from 'antd';
import _ from 'lodash';
import React, { useState } from 'react';
import intl from 'react-intl-universal';

const RegisterComponent: React.FC = () => {
  const selectedAccount: Account | undefined = useSliceSelector(getSelectedAccount);
  const isLoading = useSliceSelector(getIsGlobalLoading);
  const dispatch = useSliceDispatch();

  const [currentClaimCode, setCurrentClaimCode] = useState('');
  const [newRegistrantAddress, setNewRegistrantAddress] = useState('');

  const handleOnClick = e => {
    e.preventDefault();
    submit();
  };

  async function submit() {
    if (!currentClaimCode) {
      return;
    } else if (currentClaimCode.includes('lixi_')) {
      const claimCode = currentClaimCode.match('(?<=lixi_).*')[0];
      const dataApi: RegisterLixiPackCommand = {
        claimCode,
        account: selectedAccount,
        registrant: newRegistrantAddress
      };
      dispatch(registerLixiPack(dataApi));
      setCurrentClaimCode('');
    } else {
      const dataApi: RegisterLixiPackCommand = {
        claimCode: currentClaimCode,
        account: selectedAccount,
        registrant: newRegistrantAddress
      };
      dispatch(registerLixiPack(dataApi));
      setCurrentClaimCode('');
    }
  }

  const handleClaimCodeChange = e => {
    const { value, name } = e.target;
    let claimCode: string = _.trim(value);
    setCurrentClaimCode(claimCode);
  };

  const handleRegistrantAddressChange = e => {
    const { value, name } = e.target;
    let registrantAddress: string = _.trim(value);
    setNewRegistrantAddress(registrantAddress);
  };

  return (
    <>
      <WrapperPage className="card register-pack-component">
        <Row
          style={{
            display: 'flex'
          }}
        >
          <Col span={24}>
            <Spin spinning={isLoading} indicator={CashLoadingIcon}>
              <h3 style={{ marginBottom: '1rem', textTransform: 'uppercase' }}>Register Pack</h3>
              <Form
                style={{
                  width: 'auto'
                }}
              >
                <FormItemClaimCodeXpiInput
                  loadWithCameraOpen={false}
                  onScan={result =>
                    handleClaimCodeChange({
                      target: {
                        name: 'claimCode',
                        value: result
                      }
                    })
                  }
                  inputProps={{
                    onChange: e => handleClaimCodeChange(e),
                    value: currentClaimCode
                  }}
                ></FormItemClaimCodeXpiInput>
                <FormItemRegistrantAddressInput
                  loadWithCameraOpen={false}
                  onScan={result =>
                    handleRegistrantAddressChange({
                      target: {
                        name: 'registrantAddress',
                        value: result
                      }
                    })
                  }
                  inputProps={{
                    onChange: e => handleRegistrantAddressChange(e),
                    value: newRegistrantAddress
                  }}
                ></FormItemRegistrantAddressInput>
                <div
                  style={{
                    paddingTop: '12px'
                  }}
                >
                  <PrimaryButton onClick={handleOnClick}>{intl.get('register.register')}</PrimaryButton>
                </div>
              </Form>
            </Spin>
          </Col>
        </Row>
      </WrapperPage>
    </>
  );
};

export default RegisterComponent;
