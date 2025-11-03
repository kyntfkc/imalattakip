import React, { useState, useEffect, useMemo } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Typography, 
  Table, 
  Button, 
  Space, 
  Statistic,
  Tag,
  Modal,
  Form,
  Input,
  DatePicker,
  Select,
  Segmented,
  message,
  Popconfirm,
  Empty
} from 'antd';
import { 
  CalculatorOutlined, 
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  GoldOutlined,
  SearchOutlined,
  FilterOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import { parseNumberFromInput, formatNumberForDisplay } from '../utils/numberFormat';
import { commonStyles } from '../styles/theme';
import '../styles/animations.css';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/apiService';
import socketService from '../services/socketService';

const { Title, Text } = Typography;

interface RequiredHasItem {
  id: string;
  date: string;
  description: string;
  input: number; // Giriş (TL)
  output: number; // Çıkış (TL)
  notes?: string;
}

const { RangePicker } = DatePicker;
const { Option } = Select;

const RequiredHas: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'input' | 'output' | 'edit'>('input');
  const [editingItem, setEditingItem] = useState<RequiredHasItem | null>(null);
  const [form] = Form.useForm();
  const [items, setItems] = useState<RequiredHasItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<'all' | 'week' | 'month' | 'year'>('all');
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [searchText, setSearchText] = useState('');

  // Backend'den verileri yükle
  useEffect(() => {
    if (authLoading || !isAuthenticated) {
      setIsLoading(authLoading);
      return;
    }

    const loadItems = async () => {
      try {
        setIsLoading(true);
        console.log('📥 RequiredHas loadItems: Backend\'den veriler yükleniyor...');
        const backendItems = await apiService.getRequiredHasItems();
        console.log('✅ RequiredHas loadItems: Backend\'den', backendItems.length, 'kayıt alındı');
        
        // Backend formatını frontend formatına çevir
        const formattedItems: RequiredHasItem[] = backendItems.map((item: any) => ({
          id: item.id.toString(),
          date: item.date,
          description: item.description,
          input: parseFloat(item.input) || 0,
          output: parseFloat(item.output) || 0,
          notes: item.notes || ''
        }));
        
        setItems(formattedItems);
        console.log('✅ RequiredHas loadItems: State güncellendi,', formattedItems.length, 'kayıt');
      } catch (error) {
        console.error('❌ RequiredHas loadItems: Backend\'den veri yüklenemedi:', error);
        // Backend çalışmıyorsa localStorage'dan yükle (fallback)
        const saved = localStorage.getItem('requiredHasItems');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            console.log('📦 RequiredHas loadItems: localStorage\'dan', parsed.length, 'kayıt yüklendi');
            setItems(parsed);
          } catch (e) {
            console.error('❌ RequiredHas loadItems: localStorage parse hatası:', e);
            setItems([]);
          }
        } else {
          setItems([]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadItems();

    // Periyodik polling - Socket.io event'leri gelmeyebilir, her 10 saniyede bir yükle
    const pollingInterval = setInterval(() => {
      if (isAuthenticated) {
        console.log('🔄 RequiredHas polling: Yeni veriler yükleniyor...');
        loadItems();
      }
    }, 10000); // Her 10 saniyede bir yükle

    return () => {
      clearInterval(pollingInterval);
    };
  }, [isAuthenticated, authLoading]);

  // Real-time socket event listeners
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    // Socket bağlantısını bekle ve dinle
    const setupSocketListeners = () => {
      if (!socketService.isConnected()) {
        return;
      }

      // Item oluşturuldu handler
      const handleCreated = (data: any) => {
        console.log('🔔 RequiredHas created event:', data);
        const formattedItem: RequiredHasItem = {
          id: data.id.toString(),
          date: data.date,
          description: data.description,
          input: parseFloat(data.input) || 0,
          output: parseFloat(data.output) || 0,
          notes: data.notes || ''
        };

        setItems(prev => {
          const exists = prev.find(i => i.id === formattedItem.id);
          if (exists) return prev;
          return [formattedItem, ...prev];
        });
      };

      // Item güncellendi handler
      const handleUpdated = (data: any) => {
        console.log('🔔 RequiredHas updated event:', data);
        const formattedItem: RequiredHasItem = {
          id: data.id.toString(),
          date: data.date,
          description: data.description,
          input: parseFloat(data.input) || 0,
          output: parseFloat(data.output) || 0,
          notes: data.notes || ''
        };

        setItems(prev => prev.map(i => 
          i.id === formattedItem.id ? formattedItem : i
        ));
      };

      // Item silindi handler
      const handleDeleted = (data: { id: number }) => {
        console.log('🔔 RequiredHas deleted event:', data);
        setItems(prev => prev.filter(i => i.id !== data.id.toString()));
      };

      // Register listeners
      socketService.onRequiredHasCreated(handleCreated);
      socketService.onRequiredHasUpdated(handleUpdated);
      socketService.onRequiredHasDeleted(handleDeleted);

      return {
        handleCreated,
        handleUpdated,
        handleDeleted
      };
    };

    let handlers: any = null;

    // Socket bağlıysa hemen dinle
    if (socketService.isConnected()) {
      handlers = setupSocketListeners();
    }

    // Socket bağlantısı kurulduğunda dinle
    const socket = socketService.getSocket();
    if (socket) {
      const connectHandler = () => {
        console.log('✅ Socket connected, setting up RequiredHas listeners');
        if (handlers) {
          // Önceki listener'ları temizle
          socketService.off('requiredHas:created', handlers.handleCreated);
          socketService.off('requiredHas:updated', handlers.handleUpdated);
          socketService.off('requiredHas:deleted', handlers.handleDeleted);
        }
        handlers = setupSocketListeners();
      };
      
      // Eğer zaten bağlıysa hemen dinle
      if (socket.connected) {
        connectHandler();
      } else {
        // Bağlantı kurulduğunda dinle
        socket.on('connect', connectHandler);
      }
    }

    // Periyodik olarak socket bağlantısını kontrol et ve listener'ları yeniden kur
    const checkInterval = setInterval(() => {
      if (socketService.isConnected() && !handlers) {
        console.log('🔄 Reconnecting RequiredHas listeners');
        handlers = setupSocketListeners();
      }
    }, 2000);

    return () => {
      clearInterval(checkInterval);
      // Cleanup listeners
      if (handlers) {
        socketService.off('requiredHas:created', handlers.handleCreated);
        socketService.off('requiredHas:updated', handlers.handleUpdated);
        socketService.off('requiredHas:deleted', handlers.handleDeleted);
      }
      if (socket) {
        socket.off('connect');
      }
    };
  }, [isAuthenticated]);

  // LocalStorage'a da kaydet (backup olarak)
  useEffect(() => {
    if (!isLoading && items.length >= 0) {
      localStorage.setItem('requiredHasItems', JSON.stringify(items));
    }
  }, [items, isLoading]);

  // Filtrelenmiş kayıtları hesapla
  const filteredItems = useMemo(() => {
    let filtered = items;

    // Arama filtresi
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(item => 
        item.description.toLowerCase().includes(searchLower) ||
        (item.notes && item.notes.toLowerCase().includes(searchLower))
      );
    }

    // Tarih filtresi
    if (dateRange[0] && dateRange[1]) {
      const startDate = dateRange[0].startOf('day');
      const endDate = dateRange[1].endOf('day');
      filtered = filtered.filter(item => {
        const itemDate = dayjs(item.date);
        return itemDate.isAfter(startDate.subtract(1, 'day')) && itemDate.isBefore(endDate.add(1, 'day'));
      });
    } else if (dateFilter !== 'all') {
      const now = dayjs();
      let startDate: Dayjs;
      
      switch (dateFilter) {
        case 'week':
          startDate = now.subtract(7, 'day');
          break;
        case 'month':
          startDate = now.subtract(1, 'month');
          break;
        case 'year':
          startDate = now.subtract(1, 'year');
          break;
        default:
          return filtered;
      }
      
      filtered = filtered.filter(item => {
        const itemDate = dayjs(item.date);
        return itemDate.isAfter(startDate.subtract(1, 'day'));
      });
    }

    return filtered;
  }, [items, searchText, dateFilter, dateRange]);

  // Toplamları hesapla - filtrelenmiş kayıtlardan
  const totals = useMemo(() => {
    const totalInput = filteredItems.reduce((sum, item) => sum + (item.input || 0), 0);
    const totalOutput = filteredItems.reduce((sum, item) => sum + (item.output || 0), 0);
    const totalRequired = totalInput - totalOutput; // Alınacak toplam
    
    return {
      input: totalInput,
      output: totalOutput,
      required: totalRequired
    };
  }, [filteredItems]);


  // Verileri backend'den tekrar yükle (force reload)
  const reloadItems = async () => {
    try {
      console.log('🔄 RequiredHas reloadItems: Backend\'den veriler yükleniyor...');
      const backendItems = await apiService.getRequiredHasItems();
      console.log('✅ RequiredHas reloadItems: Backend\'den', backendItems.length, 'kayıt alındı');
      
      const formattedItems: RequiredHasItem[] = backendItems.map((item: any) => ({
        id: item.id.toString(),
        date: item.date,
        description: item.description,
        input: parseFloat(item.input) || 0,
        output: parseFloat(item.output) || 0,
        notes: item.notes || ''
      }));
      
      setItems(formattedItems);
      console.log('✅ RequiredHas reloadItems: State güncellendi,', formattedItems.length, 'kayıt');
    } catch (error) {
      console.error('❌ RequiredHas reloadItems: Veriler yüklenemedi:', error);
    }
  };

  // Ekle/düzenle
  const handleAddOrEdit = async (values: any) => {
    try {
      console.log('🚀 RequiredHas handleAddOrEdit: İşlem başlatıldı', { editingItem: !!editingItem, modalType, values });
      
      const date = values.date ? dayjs(values.date).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD');
      const description = values.description;
      const input = editingItem 
        ? (typeof values.input === 'string' ? parseNumberFromInput(values.input) : values.input || 0)
        : (modalType === 'input' 
          ? (typeof values.amount === 'string' ? parseNumberFromInput(values.amount) : values.amount || 0)
          : 0);
      const output = editingItem
        ? (typeof values.output === 'string' ? parseNumberFromInput(values.output) : values.output || 0)
        : (modalType === 'output' 
          ? (typeof values.amount === 'string' ? parseNumberFromInput(values.amount) : values.amount || 0)
          : 0);
      const notes = values.notes || '';

      console.log('📝 RequiredHas handleAddOrEdit: Hazırlanan veriler', { date, description, input, output, notes });

      if (editingItem) {
        // Backend'e güncelle
        console.log('🔄 RequiredHas handleAddOrEdit: Güncelleme yapılıyor, ID:', editingItem.id);
        await apiService.updateRequiredHasItem(parseInt(editingItem.id), {
          date,
          description,
          input,
          output,
          notes
        });
        console.log('✅ RequiredHas handleAddOrEdit: Güncelleme başarılı');
        message.success('Güncellendi!');
      } else {
        // Backend'e ekle
        console.log('➕ RequiredHas handleAddOrEdit: Yeni kayıt ekleniyor');
        const result = await apiService.createRequiredHasItem({
          date,
          description,
          input,
          output,
          notes
        });
        console.log('✅ RequiredHas handleAddOrEdit: Yeni kayıt eklendi, ID:', result?.id);
        message.success(modalType === 'input' ? 'Giriş eklendi!' : 'Çıkış eklendi!');
      }

      // İşlem sonrası verileri yeniden yükle (hemen ve kısa bir süre sonra)
      console.log('🔄 RequiredHas handleAddOrEdit: Veriler yeniden yükleniyor...');
      reloadItems(); // Hemen reload
      setTimeout(() => {
        console.log('🔄 RequiredHas handleAddOrEdit: İkinci reload yapılıyor...');
        reloadItems(); // Socket.io event gelmeyebilir, tekrar yükle
      }, 1000);

      form.resetFields();
      setModalVisible(false);
      setEditingItem(null);
      setModalType('input');
    } catch (error: any) {
      console.error('❌ RequiredHas handleAddOrEdit: Kayıt işlemi hatası:', error);
      message.error(error.message || 'Kayıt işlemi başarısız!');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      console.log('🗑️ RequiredHas handleDelete: Silme işlemi başlatıldı, ID:', id);
      await apiService.deleteRequiredHasItem(parseInt(id));
      console.log('✅ RequiredHas handleDelete: Silme başarılı');
      message.success('Silindi!');
      
      // İşlem sonrası verileri yeniden yükle (hemen ve kısa bir süre sonra)
      console.log('🔄 RequiredHas handleDelete: Veriler yeniden yükleniyor...');
      reloadItems(); // Hemen reload
      setTimeout(() => {
        console.log('🔄 RequiredHas handleDelete: İkinci reload yapılıyor...');
        reloadItems(); // Socket.io event gelmeyebilir, tekrar yükle
      }, 1000);
    } catch (error: any) {
      console.error('❌ RequiredHas handleDelete: Silme hatası:', error);
      message.error(error.message || 'Silme işlemi başarısız!');
    }
  };

  const handleEdit = (item: RequiredHasItem) => {
    setEditingItem(item);
    setModalType('edit');
    form.setFieldsValue({
      date: dayjs(item.date),
      description: item.description,
      input: item.input,
      output: item.output,
      notes: item.notes
    });
    setModalVisible(true);
  };

  const handleOpenInputModal = () => {
    setEditingItem(null);
    setModalType('input');
    form.resetFields();
    form.setFieldsValue({ date: dayjs() });
    setModalVisible(true);
  };

  const handleOpenOutputModal = () => {
    setEditingItem(null);
    setModalType('output');
    form.resetFields();
    form.setFieldsValue({ date: dayjs() });
    setModalVisible(true);
  };

  const columns: ColumnsType<RequiredHasItem> = [
    {
      title: 'Tarih',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      sorter: (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      render: (date: string) => dayjs(date).format('DD.MM.YYYY')
    },
    {
      title: 'Açıklama',
      dataIndex: 'description',
      key: 'description',
      sorter: (a, b) => a.description.localeCompare(b.description),
      render: (name: string) => (
        <Text strong style={{ color: '#1f2937' }}>{name}</Text>
      )
    },
    {
      title: 'Giriş (TL)',
      dataIndex: 'input',
      key: 'input',
      width: 120,
      align: 'right' as const,
      sorter: (a, b) => a.input - b.input,
      render: (value: number) => value > 0 ? (
        <Text style={{ color: '#52c41a', fontSize: '15px', fontWeight: '600' }}>
          {Math.round(value)}
        </Text>
      ) : (
        <Text type="secondary">-</Text>
      )
    },
    {
      title: 'Çıkış (TL)',
      dataIndex: 'output',
      key: 'output',
      width: 120,
      align: 'right' as const,
      sorter: (a, b) => a.output - b.output,
      render: (value: number, record: RequiredHasItem) => value > 0 ? (
        <Text style={{ color: '#ff4d4f', fontSize: '15px', fontWeight: '600' }}>
          {Math.round(value)}
        </Text>
      ) : (
        <Text type="secondary">-</Text>
      )
    },
    {
      title: 'Notlar',
      dataIndex: 'notes',
      key: 'notes',
      render: (notes: string) => notes ? (
        <Text type="secondary" style={{ fontSize: '12px' }}>{notes}</Text>
      ) : (
        <Text type="secondary">-</Text>
      )
    },
    {
      title: 'İşlemler',
      key: 'actions',
      width: 200,
      align: 'center' as const,
      render: (_, record: RequiredHasItem) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Düzenle
          </Button>
          <Popconfirm
            title="Sil"
            description="Bu kaydı silmek istediğinize emin misiniz?"
            onConfirm={() => handleDelete(record.id)}
            okText="Evet"
            cancelText="Hayır"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
            />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div className="fade-in" style={{ padding: '0 8px' }}>
      {/* Minimal Header */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '16px',
        border: '1px solid #e5e7eb',
        boxShadow: 'none'
      }}>
        <Space align="center" size={12}>
          <div style={{
            background: '#f8fafc',
            borderRadius: '8px',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #e5e7eb',
            width: '40px',
            height: '40px'
          }}>
            <CalculatorOutlined style={{ fontSize: '20px', color: '#64748b' }} />
          </div>
          <div>
            <Title level={4} style={{ margin: 0, color: '#1f2937', fontSize: '18px', fontWeight: '600' }}>
              Gereken Has
            </Title>
          </div>
        </Space>
      </div>

      {/* Özet İstatistik - Sadece Alınacak Toplam */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24}>
          <Card style={{ borderRadius: '20px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', background: 'linear-gradient(135deg, #fff7e6 0%, #ffe7ba 100%)' }}>
            <Statistic
              title="Alınacak Toplam"
              value={Math.round(totals.required)}
              suffix="TL"
              valueStyle={{ color: '#fa8c16', fontSize: '24px', fontWeight: '700' }}
              prefix={<GoldOutlined style={{ color: '#fa8c16' }} />}
            />
          </Card>
        </Col>
      </Row>


      {/* Tablo ve Aksiyon Butonları */}
      <Card 
        title={
          <Space>
            <CalculatorOutlined />
            <span>Gereken Has Listesi</span>
          </Space>
        }
        extra={
          <Space>
            <Button
              type="default"
              icon={<PlusOutlined />}
              onClick={handleOpenInputModal}
              size="large"
              style={{ background: '#fff1f0', borderColor: '#ff4d4f', color: '#ff4d4f' }}
            >
              Alınacak Has
            </Button>
            <Button
              type="default"
              icon={<PlusOutlined />}
              onClick={handleOpenOutputModal}
              size="large"
              style={{ background: '#f0f9ff', borderColor: '#52c41a', color: '#52c41a' }}
            >
              Alınan Has
            </Button>
          </Space>
        }
        style={{ borderRadius: commonStyles.borderRadius, boxShadow: commonStyles.cardShadow }}
      >
        {filteredItems.length === 0 && items.length > 0 ? (
          <Empty 
            description="Filtre kriterlerine uygun kayıt bulunamadı"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button onClick={() => {
              setSearchText('');
              setDateFilter('all');
              setDateRange([null, null]);
            }}>
              Filtreleri Temizle
            </Button>
          </Empty>
        ) : filteredItems.length === 0 ? (
          <Empty 
            description="Henüz kayıt yok"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Space>
              <Button 
                type="default" 
                icon={<PlusOutlined />} 
                onClick={handleOpenInputModal}
                style={{ background: '#fff1f0', borderColor: '#ff4d4f', color: '#ff4d4f' }}
              >
                Alınacak Has
              </Button>
              <Button 
                type="default" 
                icon={<PlusOutlined />} 
                onClick={handleOpenOutputModal}
                style={{ background: '#f0f9ff', borderColor: '#52c41a', color: '#52c41a' }}
              >
                Alınan Has
              </Button>
            </Space>
          </Empty>
        ) : (
          <Table
            columns={columns}
            dataSource={filteredItems}
            rowKey="id"
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} / ${total} kayıt (${items.length} toplam)`
            }}
            scroll={{ x: 1000 }}
          />
        )}
      </Card>

      {/* Alt Bilgi Satırı */}
      <div style={{
        marginTop: '24px',
        padding: '12px 16px',
        background: '#f8fafc',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '14px',
        color: '#64748b'
      }}>
        <Space size="large">
          <Text style={{ fontSize: '14px', color: '#64748b' }}>
            <Text strong style={{ color: '#ff4d4f' }}>Alınacak Toplam Has: </Text>
            {Math.round(totals.input)} TL
          </Text>
          <Text style={{ fontSize: '14px', color: '#64748b' }}>
            <Text strong style={{ color: '#52c41a' }}>Alınan Toplam Has: </Text>
            {Math.round(totals.output)} TL
          </Text>
        </Space>
      </div>

      {/* Ekleme/Düzenleme Modal */}
      <Modal
        title={
          <Space>
            {modalType === 'edit' ? <EditOutlined /> : <PlusOutlined />}
            <span>
              {modalType === 'edit' ? 'Kayıt Düzenle' : 
               modalType === 'input' ? 'Alınacak Has' : 'Alınan Has'}
            </span>
          </Space>
        }
        open={modalVisible}
        onCancel={() => {
          form.resetFields();
          setModalVisible(false);
          setEditingItem(null);
          setModalType('input');
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddOrEdit}
        >
          <Form.Item
            label="Tarih"
            name="date"
            rules={[{ required: true, message: 'Tarih seçiniz!' }]}
            initialValue={dayjs()}
          >
            <DatePicker
              style={{ width: '100%' }}
              size="large"
              format="DD.MM.YYYY"
            />
          </Form.Item>

          <Form.Item
            label="Açıklama"
            name="description"
            rules={[{ required: true, message: 'Açıklama giriniz!' }]}
          >
            <Input
              placeholder="Örn: Anka kolye, Nokta küpe..."
              size="large"
            />
          </Form.Item>

          {modalType === 'edit' ? (
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Giriş (TL)"
                  name="input"
                  getValueFromEvent={(e) => {
                    const value = e.target?.value || e;
                    return typeof value === 'string' ? value : String(value);
                  }}
                >
                  <Input
                    placeholder="0,00"
                    size="large"
                    style={{ width: '100%' }}
                    onKeyDown={(e) => {
                      const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab', 'Enter', 'Home', 'End'];
                      const key = e.key;
                      const isNumber = /^\d$/.test(key);
                      const isComma = key === ',';
                      const isDot = key === '.';
                      const isControl = allowedKeys.includes(key);
                      
                      if (isNumber || isComma || isDot || isControl || (e.ctrlKey || e.metaKey)) {
                        return;
                      }
                      e.preventDefault();
                    }}
                    onChange={(e) => {
                      let value = e.target.value;
                      if (value === '') {
                        form.setFieldsValue({ input: '' });
                        return;
                      }
                      value = value.replace(/[^\d,.]/g, '');
                      const parts = value.split(/[,.]/);
                      if (parts.length > 2) {
                        value = parts[0] + ',' + parts.slice(1).join('');
                      }
                      form.setFieldsValue({ input: value });
                    }}
                    onBlur={(e) => {
                      const value = e.target.value;
                      if (value && !isNaN(parseNumberFromInput(value))) {
                        const numericValue = parseNumberFromInput(value);
                        form.setFieldsValue({ input: numericValue });
                        setTimeout(() => {
                          e.target.value = formatNumberForDisplay(numericValue);
                        }, 0);
                      }
                    }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Çıkış (TL)"
                  name="output"
                  getValueFromEvent={(e) => {
                    const value = e.target?.value || e;
                    return typeof value === 'string' ? value : String(value);
                  }}
                >
                  <Input
                    placeholder="0,00"
                    size="large"
                    style={{ width: '100%' }}
                    onKeyDown={(e) => {
                      const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab', 'Enter', 'Home', 'End'];
                      const key = e.key;
                      const isNumber = /^\d$/.test(key);
                      const isComma = key === ',';
                      const isDot = key === '.';
                      const isControl = allowedKeys.includes(key);
                      
                      if (isNumber || isComma || isDot || isControl || (e.ctrlKey || e.metaKey)) {
                        return;
                      }
                      e.preventDefault();
                    }}
                    onChange={(e) => {
                      let value = e.target.value;
                      if (value === '') {
                        form.setFieldsValue({ output: '' });
                        return;
                      }
                      value = value.replace(/[^\d,.]/g, '');
                      const parts = value.split(/[,.]/);
                      if (parts.length > 2) {
                        value = parts[0] + ',' + parts.slice(1).join('');
                      }
                      form.setFieldsValue({ output: value });
                    }}
                    onBlur={(e) => {
                      const value = e.target.value;
                      if (value && !isNaN(parseNumberFromInput(value))) {
                        const numericValue = parseNumberFromInput(value);
                        form.setFieldsValue({ output: numericValue });
                        setTimeout(() => {
                          e.target.value = formatNumberForDisplay(numericValue);
                        }, 0);
                      }
                    }}
                  />
                </Form.Item>
              </Col>
            </Row>
          ) : (
            <Form.Item
              label={modalType === 'input' ? 'Giriş Miktarı (TL)' : 'Çıkış Miktarı (TL)'}
              name="amount"
              rules={[
                { required: true, message: `${modalType === 'input' ? 'Giriş' : 'Çıkış'} miktarını giriniz!` },
                {
                  validator: (_, value) => {
                    if (!value && value !== 0 && value !== '') {
                      return Promise.reject(new Error(`${modalType === 'input' ? 'Giriş' : 'Çıkış'} miktarını giriniz!`));
                    }
                    const numValue = typeof value === 'string' ? parseNumberFromInput(value) : value;
                    if (isNaN(numValue) || numValue <= 0) {
                      return Promise.reject(new Error('Miktar 0\'dan büyük olmalı!'));
                    }
                    return Promise.resolve();
                  }
                }
              ]}
              getValueFromEvent={(e) => {
                const value = e.target?.value || e;
                return typeof value === 'string' ? value : String(value);
              }}
            >
              <Input
                placeholder="0,00"
                size="large"
                style={{ width: '100%' }}
                onKeyDown={(e) => {
                  const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab', 'Enter', 'Home', 'End'];
                  const key = e.key;
                  const isNumber = /^\d$/.test(key);
                  const isComma = key === ',';
                  const isDot = key === '.';
                  const isControl = allowedKeys.includes(key);
                  
                  if (isNumber || isComma || isDot || isControl || (e.ctrlKey || e.metaKey)) {
                    return;
                  }
                  e.preventDefault();
                }}
                onChange={(e) => {
                  let value = e.target.value;
                  if (value === '') {
                    form.setFieldsValue({ amount: '' });
                    return;
                  }
                  value = value.replace(/[^\d,.]/g, '');
                  const parts = value.split(/[,.]/);
                  if (parts.length > 2) {
                    value = parts[0] + ',' + parts.slice(1).join('');
                  }
                  form.setFieldsValue({ amount: value });
                }}
                onBlur={(e) => {
                  const value = e.target.value;
                  if (value && !isNaN(parseNumberFromInput(value))) {
                    const numericValue = parseNumberFromInput(value);
                    form.setFieldsValue({ amount: numericValue });
                    setTimeout(() => {
                      e.target.value = formatNumberForDisplay(numericValue);
                    }, 0);
                  }
                }}
              />
            </Form.Item>
          )}

          <Form.Item
            label="Notlar"
            name="notes"
          >
            <Input.TextArea
              placeholder="Ek notlar..."
              rows={3}
            />
          </Form.Item>

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button 
                onClick={() => {
                  form.resetFields();
                  setModalVisible(false);
                  setEditingItem(null);
                  setModalType('input');
                }}
                size="large"
              >
                İptal
              </Button>
              <Button 
                type="primary" 
                htmlType="submit"
                size="large"
                icon={editingItem ? <EditOutlined /> : <PlusOutlined />}
              >
                {editingItem ? 'Güncelle' : 'Ekle'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RequiredHas;
