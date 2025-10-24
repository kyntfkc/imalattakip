import React, { useState } from 'react';
import { 
  Card, 
  Form, 
  Select, 
  InputNumber, 
  Button, 
  Row, 
  Col, 
  Typography, 
  Space, 
  Divider,
  Tag,
  Statistic,
  Input,
  message
} from 'antd';
import { 
  SwapOutlined, 
  GoldOutlined, 
  ToolOutlined, 
  ThunderboltOutlined, 
  CrownOutlined, 
  BankOutlined,
  CalculatorOutlined,
  ShoppingCartOutlined
} from '@ant-design/icons';
import { useTransfers } from '../context/TransferContext';
import { useCinsiSettings, CinsiOption } from '../context/CinsiSettingsContext';
import { UnitType, KaratType } from '../types';
import { parseNumberFromInput, formatNumberForDisplay } from '../utils/numberFormat';

const { Title, Text } = Typography;
const { Option } = Select;

interface TransferData {
  fromUnit: UnitType;
  toUnit: UnitType;
  amount: number;
  karat: KaratType;
  notes?: string;
}

const TransferForm: React.FC = () => {
  const { addNewTransfer } = useTransfers();
  const { cinsiOptions } = useCinsiSettings();
  const [form] = Form.useForm();
  const [transferData, setTransferData] = useState<TransferData | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const units = [
    { value: 'ana-kasa', label: 'Ana Kasa', icon: <BankOutlined /> },
    { value: 'yarimamul', label: 'Yarımamül', icon: <GoldOutlined /> },
    { value: 'lazer-kesim', label: 'Lazer Kesim', icon: <ThunderboltOutlined /> },
    { value: 'tezgah', label: 'Tezgah', icon: <ToolOutlined /> },
    { value: 'cila', label: 'Cila', icon: <CrownOutlined /> },
    { value: 'dokum', label: 'Döküm', icon: <GoldOutlined /> },
    { value: 'tedarik', label: 'Tedarik', icon: <ToolOutlined /> },
    { value: 'satis', label: 'Satış', icon: <ShoppingCartOutlined /> },
    { value: 'dis-kasa', label: 'Dış Kasa', icon: <BankOutlined /> }
  ];

  const karatOptions = [
    { value: '14K', label: '14 Ayar' },
    { value: '18K', label: '18 Ayar' },
    { value: '22K', label: '22 Ayar' },
    { value: '24K', label: 'Has Altın' }
  ];

  const getUnitIcon = (unitValue: string) => {
    const unit = units.find(u => u.value === unitValue);
    return unit?.icon;
  };

  const getUnitLabel = (unitValue: string) => {
    const unit = units.find(u => u.value === unitValue);
    return unit?.label;
  };

  const handlePreview = () => {
    form.validateFields().then(values => {
      setTransferData(values);
      setShowPreview(true);
    });
  };

  const handleSubmit = () => {
    if (!transferData) return;
    
    // Transfer işlemini kaydet
    addNewTransfer({
      fromUnit: transferData.fromUnit,
      toUnit: transferData.toUnit,
      karat: transferData.karat,
      amount: transferData.amount,
      notes: transferData.notes
    });
    
    message.success('Transfer işlemi başarıyla tamamlandı!');
    form.resetFields();
    setShowPreview(false);
    setTransferData(null);
  };

  const handleReset = () => {
    form.resetFields();
    setShowPreview(false);
    setTransferData(null);
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>
          <SwapOutlined style={{ marginRight: 8 }} />
          Transfer İşlemi
        </Title>
        <Text type="secondary">
          Birimler arası altın transferi ve fire hesabı
        </Text>
      </div>

      <Row gutter={24}>
        <Col xs={24} lg={16}>
          <Card title="Transfer Bilgileri" style={{ borderRadius: 12 }}>
            <Form
              form={form}
              layout="vertical"
              onFinish={handlePreview}
            >
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Kaynak Birim"
                    name="fromUnit"
                    rules={[{ required: true, message: 'Kaynak birim seçiniz!' }]}
                  >
                    <Select
                      placeholder="Kaynak birimi seçin"
                      size="large"
                      showSearch
                      optionFilterProp="children"
                    >
                      {units.map(unit => (
                        <Option key={unit.value} value={unit.value}>
                          <Space>
                            {unit.icon}
                            {unit.label}
                          </Space>
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>

                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Hedef Birim"
                    name="toUnit"
                    rules={[{ required: true, message: 'Hedef birim seçiniz!' }]}
                  >
                    <Select
                      placeholder="Hedef birimi seçin"
                      size="large"
                      showSearch
                      optionFilterProp="children"
                    >
                      {units.map(unit => (
                        <Option key={unit.value} value={unit.value}>
                          <Space>
                            {unit.icon}
                            {unit.label}
                          </Space>
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Ayar"
                    name="karat"
                    rules={[{ required: true, message: 'Ayar seçiniz!' }]}
                    initialValue="14K"
                  >
                    <Select
                      placeholder="Altın ayarını seçin"
                      size="large"
                    >
                      {karatOptions.map(karat => (
                        <Option key={karat.value} value={karat.value}>
                          {karat.label}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>

                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Miktar (gram)"
                    name="amount"
                    rules={[
                      { required: true, message: 'Miktar giriniz!' },
                      { type: 'number', min: 0.01, message: 'Miktar 0.01\'den büyük olmalı!' }
                    ]}
                  >
                    <Input
                      placeholder="0,00"
                      size="large"
                      style={{ width: '100%' }}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Sadece sayı, virgül ve nokta karakterlerine izin ver
                        if (/^[\d,.]*$/.test(value)) {
                          // Form'a parse edilmiş değeri gönder
                          const numericValue = parseNumberFromInput(value);
                          if (!isNaN(numericValue)) {
                            form.setFieldsValue({ amount: numericValue });
                          }
                        }
                      }}
                      onBlur={(e) => {
                        const value = e.target.value;
                        if (value && !isNaN(parseNumberFromInput(value))) {
                          const formattedValue = formatNumberForDisplay(parseNumberFromInput(value));
                          e.target.value = formattedValue;
                        }
                      }}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Cinsi"
                    name="cinsi"
                  >
                    <Select
                      placeholder="Cinsi seçiniz"
                      size="large"
                      allowClear
                    >
                      {cinsiOptions.map((cinsi: CinsiOption) => (
                        <Option key={cinsi.value} value={cinsi.value}>
                          {cinsi.label}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>

                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Notlar"
                    name="notes"
                  >
                    <Input.TextArea
                      placeholder="Transfer hakkında notlar..."
                      rows={3}
                      size="large"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item>
                <Space>
                  <Button 
                    type="primary" 
                    htmlType="submit"
                    icon={<CalculatorOutlined />}
                    size="large"
                  >
                    Önizleme
                  </Button>
                  <Button 
                    onClick={handleReset}
                    size="large"
                  >
                    Temizle
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="Transfer Özeti" style={{ borderRadius: 12 }}>
            {showPreview && transferData ? (
              <div>
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                  <div>
                    <Text strong>Kaynak:</Text>
                    <div style={{ marginTop: 4 }}>
                      <Space>
                        {getUnitIcon(transferData.fromUnit)}
                        <Text>{getUnitLabel(transferData.fromUnit)}</Text>
                      </Space>
                    </div>
                  </div>

                  <div>
                    <Text strong>Hedef:</Text>
                    <div style={{ marginTop: 4 }}>
                      <Space>
                        {getUnitIcon(transferData.toUnit)}
                        <Text>{getUnitLabel(transferData.toUnit)}</Text>
                      </Space>
                    </div>
                  </div>

                  <Divider />

                  <Row gutter={16}>
                    <Col span={12}>
                      <Statistic
                        title="Transfer Miktarı"
                        value={transferData.amount}
                        suffix="gr"
                        valueStyle={{ color: '#1890ff' }}
                        precision={2}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="Ayar"
                        value={transferData.karat}
                        valueStyle={{ color: '#52c41a' }}
                      />
                    </Col>
                  </Row>

                  <Divider />

                  <Button 
                    type="primary" 
                    size="large"
                    onClick={handleSubmit}
                    style={{ width: '100%' }}
                    icon={<SwapOutlined />}
                  >
                    Transferi Onayla
                  </Button>
                </Space>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
                <CalculatorOutlined style={{ fontSize: '48px', marginBottom: 16 }} />
                <div>Transfer bilgilerini doldurun ve önizleme yapın</div>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default TransferForm;
