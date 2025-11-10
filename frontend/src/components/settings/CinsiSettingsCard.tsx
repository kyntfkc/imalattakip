import React, { useState } from 'react';
import { Card, Space, Typography, Button, Modal, Input, Popconfirm } from 'antd';
import { GoldOutlined, PlusOutlined, EditOutlined, DeleteOutlined, HolderOutlined } from '@ant-design/icons';
import { useCinsiSettings, CinsiOption } from '../../context/CinsiSettingsContext';
import { SETTINGS_CONSTANTS, SETTINGS_TEXTS } from '../../constants/settings';
import { message } from 'antd';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const { Title, Text } = Typography;

interface CinsiSettingsCardProps {
  className?: string;
}

interface SortableCinsiItemProps {
  cinsi: { id: string; value: string; label: string };
  onEdit: (cinsi: { id: string; value: string; label: string }) => void;
  onDelete: (id: string) => void;
}

const SortableCinsiItem: React.FC<SortableCinsiItemProps> = ({ cinsi, onEdit, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: cinsi.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        padding: '12px 16px',
        marginBottom: '8px',
        background: '#ffffff',
        border: '1px solid #f0f0f0',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'grab',
        boxShadow: isDragging ? '0 4px 12px rgba(0, 0, 0, 0.15)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          {...attributes}
          {...listeners}
          style={{
            cursor: 'grab',
            padding: '4px',
            borderRadius: '4px',
            color: '#8c8c8c',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <HolderOutlined style={{ fontSize: '16px' }} />
        </div>
        <div>
          <div style={{ fontWeight: '500', color: '#1f2937', fontSize: '14px' }}>
            {cinsi.label}
          </div>
          <div style={{ color: '#6b7280', fontSize: '12px' }}>
            Değer: {cinsi.value}
          </div>
        </div>
      </div>
      
      <Space>
        <Button
          type="text"
          icon={<EditOutlined />}
          onClick={() => onEdit(cinsi)}
          style={{ color: '#1890ff' }}
        />
        <Popconfirm
          title="Cinsi Silme"
          description="Bu cinsi seçeneğini silmek istediğinize emin misiniz?"
          okText="Evet, Sil"
          cancelText="İptal"
          okType="danger"
          onConfirm={() => onDelete(cinsi.id)}
        >
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
          />
        </Popconfirm>
      </Space>
    </div>
  );
};

export const CinsiSettingsCard: React.FC<CinsiSettingsCardProps> = ({ className }) => {
  const { cinsiOptions, addCinsi, updateCinsi, deleteCinsi, reorderCinsi, resetToDefaults: resetCinsiDefaults } = useCinsiSettings();
  
  const [cinsiModalVisible, setCinsiModalVisible] = useState(false);
  const [editingCinsi, setEditingCinsi] = useState<{ id: string; value: string; label: string } | null>(null);
  const [newCinsiValue, setNewCinsiValue] = useState('');
  const [newCinsiLabel, setNewCinsiLabel] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = cinsiOptions.findIndex((item: CinsiOption) => item.id === active.id);
      const newIndex = cinsiOptions.findIndex((item: CinsiOption) => item.id === over?.id);

      reorderCinsi(oldIndex, newIndex);
    }
  };

  const handleAddCinsi = () => {
    if (!newCinsiValue.trim() || !newCinsiLabel.trim()) {
      message.error(SETTINGS_CONSTANTS.MESSAGES.ERROR.CINSI_VALIDATION);
      return;
    }
    
    const existingValue = cinsiOptions.find((c: CinsiOption) => c.value === newCinsiValue.toLowerCase().replace(/\s+/g, '-'));
    const existingLabel = cinsiOptions.find((c: CinsiOption) => c.label.toLowerCase() === newCinsiLabel.toLowerCase());
    
    if (existingValue) {
      message.error(SETTINGS_CONSTANTS.MESSAGES.ERROR.CINSI_DUPLICATE_VALUE);
      return;
    }
    
    if (existingLabel) {
      message.error(SETTINGS_CONSTANTS.MESSAGES.ERROR.CINSI_DUPLICATE_LABEL);
      return;
    }
    
    addCinsi(newCinsiValue, newCinsiLabel);
    setNewCinsiValue('');
    setNewCinsiLabel('');
    setCinsiModalVisible(false);
    message.success(SETTINGS_CONSTANTS.MESSAGES.SUCCESS.CINSI_ADDED);
  };

  const handleEditCinsi = (cinsi: { id: string; value: string; label: string }) => {
    setEditingCinsi(cinsi);
    setNewCinsiValue(cinsi.value);
    setNewCinsiLabel(cinsi.label);
    setCinsiModalVisible(true);
  };

  const handleUpdateCinsi = () => {
    if (!editingCinsi || !newCinsiValue.trim() || !newCinsiLabel.trim()) {
      message.error(SETTINGS_CONSTANTS.MESSAGES.ERROR.CINSI_VALIDATION);
      return;
    }
    
    const existingValue = cinsiOptions.find((c: CinsiOption) => c.value === newCinsiValue.toLowerCase().replace(/\s+/g, '-') && c.id !== editingCinsi.id);
    const existingLabel = cinsiOptions.find((c: CinsiOption) => c.label.toLowerCase() === newCinsiLabel.toLowerCase() && c.id !== editingCinsi.id);
    
    if (existingValue) {
      message.error(SETTINGS_CONSTANTS.MESSAGES.ERROR.CINSI_DUPLICATE_VALUE);
      return;
    }
    
    if (existingLabel) {
      message.error(SETTINGS_CONSTANTS.MESSAGES.ERROR.CINSI_DUPLICATE_LABEL);
      return;
    }
    
    updateCinsi(editingCinsi.id, newCinsiValue, newCinsiLabel);
    setEditingCinsi(null);
    setNewCinsiValue('');
    setNewCinsiLabel('');
    setCinsiModalVisible(false);
    message.success(SETTINGS_CONSTANTS.MESSAGES.SUCCESS.CINSI_UPDATED);
  };

  const handleResetCinsiDefaults = () => {
    Modal.confirm({
      title: 'Varsayılan Ayarlara Dön',
      content: 'Tüm cinsi seçenekleri varsayılan değerlere döndürülecek. Devam etmek istediğinize emin misiniz?',
      okText: 'Evet, Sıfırla',
      cancelText: 'İptal',
      onOk: () => {
        resetCinsiDefaults();
        message.success(SETTINGS_CONSTANTS.MESSAGES.SUCCESS.CINSI_RESET);
      }
    });
  };

  const handleCinsiModalCancel = () => {
    setCinsiModalVisible(false);
    setEditingCinsi(null);
    setNewCinsiValue('');
    setNewCinsiLabel('');
  };

  return (
    <>
      <Card
        title={
          <Space>
            <GoldOutlined />
            <span>{SETTINGS_TEXTS.TITLES.CINSI_SETTINGS}</span>
          </Space>
        }
        style={{ borderRadius: 12 }}
        className={className}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
              <Title level={5}>Mevcut Cinsi Seçenekleri</Title>
              <Space>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setCinsiModalVisible(true)}
                >
                  {SETTINGS_TEXTS.BUTTONS.ADD_CINSI}
                </Button>
                <Button
                  onClick={handleResetCinsiDefaults}
                >
                  {SETTINGS_TEXTS.BUTTONS.RESET_CINSI_DEFAULTS}
                </Button>
              </Space>
            </Space>
            
            <div style={{ marginTop: '16px' }}>
              <Text type="secondary" style={{ fontSize: '12px', marginBottom: '8px', display: 'block' }}>
                💡 Sıralamayı değiştirmek için öğeleri sürükleyip bırakabilirsiniz
              </Text>
              
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={cinsiOptions.map((c: CinsiOption) => c.id)} strategy={verticalListSortingStrategy}>
                  {cinsiOptions.map((cinsi: CinsiOption) => (
                    <SortableCinsiItem
                      key={cinsi.id}
                      cinsi={cinsi}
                      onEdit={handleEditCinsi}
                      onDelete={(id) => {
                        deleteCinsi(id);
                        message.success(SETTINGS_CONSTANTS.MESSAGES.SUCCESS.CINSI_DELETED);
                      }}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          </div>
        </Space>
      </Card>

      {/* Cinsi Ekleme/Düzenleme Modal */}
      <Modal
        title={
          <Space>
            <GoldOutlined />
            <span>{editingCinsi ? 'Cinsi Düzenle' : 'Yeni Cinsi Ekle'}</span>
          </Space>
        }
        open={cinsiModalVisible}
        onCancel={handleCinsiModalCancel}
        footer={[
          <Button key="cancel" onClick={handleCinsiModalCancel}>
            {SETTINGS_TEXTS.BUTTONS.CANCEL}
          </Button>,
          <Button
            key="submit"
            type="primary"
            onClick={editingCinsi ? handleUpdateCinsi : handleAddCinsi}
          >
            {editingCinsi ? SETTINGS_TEXTS.BUTTONS.UPDATE : SETTINGS_TEXTS.BUTTONS.ADD}
          </Button>
        ]}
        width={500}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Text strong>Etiket (Görünen Ad)</Text>
            <Input
              placeholder={SETTINGS_TEXTS.PLACEHOLDERS.CINSI_LABEL}
              value={newCinsiLabel}
              onChange={(e) => setNewCinsiLabel(e.target.value)}
              style={{ marginTop: 8 }}
            />
          </div>
          
          <div>
            <Text strong>Değer (Sistem Değeri)</Text>
            <Input
              placeholder={SETTINGS_TEXTS.PLACEHOLDERS.CINSI_VALUE}
              value={newCinsiValue}
              onChange={(e) => setNewCinsiValue(e.target.value)}
              style={{ marginTop: 8 }}
            />
            <Text type="secondary" style={{ fontSize: '12px', marginTop: 4, display: 'block' }}>
              {SETTINGS_TEXTS.DESCRIPTIONS.CINSI_VALUE_HINT}
            </Text>
          </div>
        </Space>
      </Modal>
    </>
  );
};
