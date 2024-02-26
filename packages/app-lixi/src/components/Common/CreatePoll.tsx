import { useState } from 'react';
import { Button, Col, Form, Input, Radio, Row, Select } from 'antd';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';
import { PollTypeSelect, PollTypeAdd, POST_TYPE } from '@bcpros/lixi-models/constants';
import styled from 'styled-components';
import intl from 'react-intl-universal';
import moment from 'moment';

const CreatePollContent = styled.div`
  .btn-post {
    position: absolute;
    bottom: 10px;
    right: 5%;
    min-width: 140px;
  }
`;

const CreatePollForm = styled(Form)`
  border: 1px solid #ced0d4;
  padding: 10px 16px;
  border-radius: 10px;
  width: 75%;
  margin-bottom: 3rem;

  .ant-form-item {
    margin-bottom: 10px;

    .ant-select {
      padding: 3px;
      min-height: 0 !important;
    }
  }
  .error-message {
    color: red;
  }
  .option {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  input {
    margin-top: 0 !important;
    width: 100% !important;
  }
  .ant-row {
    flex-wrap: nowrap;
    gap: 5px;
  }
`;

type CreatePollProps = {
  handleClickPoll: () => void;
  onSubmit?: (value) => void;
};

const CreatePoll = ({ handleClickPoll, onSubmit }: CreatePollProps) => {
  const [options, setOptions] = useState(['', '']);
  const [arrayDays, setArrayDays] = useState(Array.from(Array(8).keys()).map(i => ({ value: i, label: `${i}` })));
  const [arrayHours, setArrayHours] = useState(Array.from(Array(24).keys()).map(i => ({ value: i, label: `${i}` })));
  const [arrayMinutes, setArrayMinutes] = useState(
    Array.from(Array(60).keys()).map(i => ({ value: i, label: `${i}` }))
  );

  const {
    handleSubmit,
    formState: { errors },
    control,
    getValues
  } = useForm();

  const onSubmitForm: SubmitHandler<any> = async data => {
    const pollTypeAdd = 'type-poll-add';
    const pollTypeSelect = 'type-poll-select';
    const endTime = moment();
    //make array option from separate option
    const optionsArray = options.map((item, index) => {
      const currentOption = `option-${index}`;
      return { option: data[currentOption] };
    });

    //make closeTime from separate time
    if (data.days === 0 && data.hours === 0 && data.minutes === 0) {
      endTime.minutes(endTime.minutes() + 5);
    } else {
      endTime.date(endTime.date() + data.days);
      endTime.hours(endTime.hours() + data.hours);
      endTime.minutes(endTime.minutes() + data.minutes);
    }

    const submitData = {
      question: data.question,
      options: optionsArray,
      endDate: endTime,
      singleSelect: !!data[pollTypeSelect],
      canAddOption: !!data[pollTypeAdd],
      postType: POST_TYPE.POLL
    };
    onSubmit(submitData);
  };

  const handleAddOption = () => {
    setOptions(pre => [...pre, '']);
  };

  return (
    <CreatePollContent>
      <CreatePollForm>
        <Form.Item label={intl.get('poll.question')}>
          <Controller
            name="question"
            control={control}
            rules={{ required: true }}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input autoFocus value={value} onChange={onChange} onBlur={onBlur} />
            )}
          />
          {errors.question && <p className="error-message">{intl.get('poll.requireField')}</p>}
        </Form.Item>
        {options.map((item, index) => (
          <Form.Item label={`${intl.get('poll.option')} ${index + 1}`}>
            <Controller
              name={`option-${index}`}
              control={control}
              rules={index < 2 && { required: true }}
              render={({ field: { value, onChange } }) => (
                <div className="option">
                  <Input value={value} onChange={onChange} placeholder={index < 2 ? 'Require' : 'Optional'} />
                </div>
              )}
            />
            {errors[`option-${index}`] && <p className="error-message">{intl.get('poll.requireField')}</p>}
          </Form.Item>
        ))}
        {options.length < 4 && <Button onClick={handleAddOption}> {intl.get('poll.addOption')}</Button>}

        <Row>
          <Col span={8}>
            <Form.Item label={intl.get('poll.day')}>
              <Controller
                name="days"
                control={control}
                defaultValue={1}
                render={({ field: { value, onChange } }) => (
                  <Select defaultValue={1} options={arrayDays} onChange={onChange} />
                )}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label={intl.get('poll.hour')}>
              <Controller
                name="hours"
                control={control}
                defaultValue={1}
                render={({ field: { value, onChange } }) => (
                  <Select
                    defaultValue={1}
                    options={arrayHours}
                    onChange={value => {
                      onChange(value);
                      if (value === 0 && getValues('days') === 0) {
                        setArrayMinutes(preArray => preArray.filter(item => item.value > 4));
                      }
                    }}
                  />
                )}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label={intl.get('poll.minute')}>
              <Controller
                name="minutes"
                control={control}
                defaultValue={5}
                render={({ field: { value, onChange } }) => (
                  <Select defaultValue={5} options={arrayMinutes} onChange={onChange} />
                )}
              />
            </Form.Item>
          </Col>
        </Row>

        {/* TODO */}
        {/* <Form.Item label={intl.get('poll.selectType')}>
          <Controller
            name="type-poll-select"
            control={control}
            defaultValue={PollTypeSelect.single}
            render={({ field: { onChange, value } }) => (
              <Radio.Group value={value} onChange={onChange}>
                <Radio value={PollTypeSelect.single}> {intl.get('poll.singleType')}</Radio>
                <Radio value={PollTypeSelect.mutiple}> {intl.get('poll.mutipleType')}</Radio>
              </Radio.Group>
            )}
          />
        </Form.Item>
        <Form.Item label={intl.get('poll.canAdd')}>
          <Controller
            name="type-poll-add"
            control={control}
            defaultValue={PollTypeAdd.no}
            render={({ field: { onChange, value } }) => (
              <Radio.Group value={value} onChange={onChange}>
                <Radio value={PollTypeAdd.no}> {intl.get('poll.notAddType')}</Radio>
                <Radio value={PollTypeAdd.yes}> {intl.get('poll.addType')}</Radio>
              </Radio.Group>
            )}
          />
        </Form.Item> */}
        <Button type="primary" onClick={handleClickPoll}>
          {intl.get('poll.removePoll')}
        </Button>
      </CreatePollForm>
      <Button className="btn-post" type="primary" htmlType="submit" onClick={handleSubmit(onSubmitForm)}>
        {intl.get('post.postTitle')}
      </Button>
    </CreatePollContent>
  );
};

export default CreatePoll;
