'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Calendar, 
  DollarSign, 
  Archive, 
  Plus,
  Filter,
  Eye,
  Edit,
  Clock
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface Group {
  id: string;
  name: string;
  type: string;
  status?: string;
  start_date: string;
  end_date: string;
  guide_name?: string;
  participant_count: number;
  total_paid: number;
  total_remaining: number;
  creator_name?: string;
  created_at: string;
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const router = useRouter();

  useEffect(() => {
    fetchGroups();
  }, [statusFilter, typeFilter, page]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        status: statusFilter,
        type: typeFilter,
        page: page.toString(),
        limit: '10'
      });

      const response = await fetch(`/api/groups?${params}`);
      if (response.ok) {
        const data = await response.json();
        setGroups(data.data);
      } else {
        toast.error('Gruplar yüklenirken hata oluştu');
      }
    } catch (error) {
      console.error('Fetch groups error:', error);
      toast.error('Bağlantı hatası');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'planning': { variant: 'secondary' as const, text: 'Planlanıyor' },
      'active': { variant: 'default' as const, text: 'Aktif' },
      'completed': { variant: 'outline' as const, text: 'Tamamlandı' },
      'archived': { variant: 'destructive' as const, text: 'Arşivlendi' },
      'cancelled': { variant: 'destructive' as const, text: 'İptal Edildi' }
    };
    
    const config = variants[status as keyof typeof variants] || variants.planning;
    return <Badge variant={config.variant}>{config.text}</Badge>;
  };

  const getTypeText = (type: string) => {
    return type === 'hac' ? 'Hac' : type === 'umre' ? 'Umre' : 'Diğer';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  const handleArchiveGroup = async (groupId: string) => {
    if (!confirm('Bu grubu arşivlemek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
      return;
    }

    try {
      const response = await fetch('/api/groups/archive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          groupId: groupId,
          notes: 'Manuel arşivleme'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Grup başarıyla arşivlendi!');
        toast.info(`Arşiv dosyaları: public${data.archivePath}`);
        fetchGroups(); // Listeyi yenile
      } else {
        const error = await response.json();
        toast.error(error.error || 'Arşivleme sırasında hata oluştu');
      }
    } catch (error) {
      console.error('Archive error:', error);
      toast.error('Bağlantı hatası');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Grup Yönetimi</h1>
          <p className="text-muted-foreground mt-2">
            Hac ve Umre gruplarınızı yönetin, katılımcıları takip edin
          </p>
        </div>
        <Button onClick={() => router.push('/groups/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Yeni Grup
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtreler
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Durum</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="planning">Planlanıyor</SelectItem>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="completed">Tamamlandı</SelectItem>
                  <SelectItem value="archived">Arşivlendi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Tür</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="hac">Hac</SelectItem>
                  <SelectItem value="umre">Umre</SelectItem>
                  <SelectItem value="diger">Diğer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Groups List */}
      <div className="grid gap-6">
        {groups.map((group) => (
          <Card key={group.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <CardTitle className="text-xl">{group.name}</CardTitle>
                    {getStatusBadge(group.status)}
                    <Badge variant="outline">{getTypeText(group.type)}</Badge>
                  </div>
                  <CardDescription className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDate(group.start_date)} - {formatDate(group.end_date)}
                    </span>
                    {group.guide_name && (
                      <span>Rehber: {group.guide_name}</span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      Oluşturulma: {formatDate(group.created_at)}
                    </span>
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => router.push(`/groups/${group.id}`)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Görüntüle
                  </Button>
                  {group.status !== 'archived' && (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => router.push(`/groups/${group.id}/edit`)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Düzenle
                      </Button>
                      {/* Arşivleme butonu - tüm gruplarda görünür */}
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleArchiveGroup(group.id)}
                        className="text-orange-600 hover:text-orange-700"
                      >
                        <Archive className="h-4 w-4 mr-1" />
                        Arşivle
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  <div>
                    <div className="text-sm text-muted-foreground">Katılımcı</div>
                    <div className="font-semibold">{group.participant_count} kişi</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-500" />
                  <div>
                    <div className="text-sm text-muted-foreground">Toplanan</div>
                    <div className="font-semibold text-green-600">
                      {formatCurrency(group.total_paid)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-500" />
                  <div>
                    <div className="text-sm text-muted-foreground">Kalan</div>
                    <div className="font-semibold text-orange-600">
                      {formatCurrency(group.total_remaining)}
                    </div>
                  </div>
                </div>
              </div>
              
              {group.status === 'archived' && (
                <div className="mt-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex items-center gap-2 text-orange-700">
                    <Archive className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      Bu grup arşivlenmiştir. Arşiv dosyalarına erişmek için sistem yöneticisine başvurun.
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {groups.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Henüz grup bulunmuyor</h3>
            <p className="text-muted-foreground mb-4">
              İlk hac veya umre grubunuzu oluşturmak için başlayın
            </p>
            <Button onClick={() => router.push('/groups/new')}>
              <Plus className="h-4 w-4 mr-2" />
              İlk Grubu Oluştur
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}