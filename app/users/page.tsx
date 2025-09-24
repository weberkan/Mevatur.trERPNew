'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, Calendar, Mail, Shield, AlertTriangle, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/auth-guard';
import TopNav from '@/components/top-nav';

interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
  last_login: string | null;
  role_name: string;
  company_name: string;
}

interface Role {
  id: number;
  name: string;
  description: string;
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    fullName: '',
    roleId: ''
  });

  // Edit form state
  const [editFormData, setEditFormData] = useState({
    id: '',
    username: '',
    email: '',
    fullName: '',
    roleId: '',
    isActive: true
  });

  // Kullanıcıları yükle
  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      
      if (response.status === 403) {
        setAccessDenied(true);
        return;
      }
      
      if (data.success) {
        setUsers(data.users);
      } else {
        toast.error(data.error || 'Kullanıcılar yüklenemedi');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
  };

  // Rolleri yükle
  const fetchRoles = async () => {
    try {
      const response = await fetch('/api/roles');
      const data = await response.json();
      
      if (response.status === 403) {
        setAccessDenied(true);
        return;
      }
      
      if (data.success) {
        setRoles(data.roles);
      } else {
        toast.error(data.error || 'Roller yüklenemedi');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
  };

  // Admin kontrolü
  useEffect(() => {
    const userStr = sessionStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.role !== 'admin') {
        // Admin değilse dashboard'a yönlendir
        router.push('/dashboard');
        return;
      }
    } else {
      // Kullanıcı giriş yapmamışsa login'e yönlendir
      router.push('/login');
      return;
    }
    
    const loadData = async () => {
      await Promise.all([fetchUsers(), fetchRoles()]);
      setLoading(false);
    };
    loadData();
  }, [router]);

  // Kullanıcı düzenleme için aç
  const openEditDialog = (user: User) => {
    // Admin kullanıcısını düzenlenemez
    if (user.role_name === 'admin') {
      toast.error('Admin kullanıcısı düzenlenemez');
      return;
    }

    setEditingUser(user);
    setEditFormData({
      id: user.id.toString(),
      username: user.username,
      email: user.email,
      fullName: user.full_name,
      roleId: roles.find(r => r.name === user.role_name)?.id.toString() || '',
      isActive: user.is_active
    });
    setIsEditDialogOpen(true);
  };

  // Kullanıcı güncelle
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editFormData),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Kullanıcı başarıyla güncellendi');
        setIsEditDialogOpen(false);
        setEditingUser(null);
        await fetchUsers(); // Listeyi yenile
      } else {
        toast.error(data.error || 'Kullanıcı güncellenemedi');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    } finally {
      setFormLoading(false);
    }
  };

  // Kullanıcı sil
  const handleDeleteUser = async (user: User) => {
    // Admin kullanıcısı silinemez
    if (user.role_name === 'admin') {
      toast.error('Admin kullanıcısı silinemez');
      return;
    }

    if (!confirm(`${user.full_name} kullanıcısını silmek istediğinize emin misiniz?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/users?id=${user.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Kullanıcı başarıyla silindi');
        await fetchUsers(); // Listeyi yenile
      } else {
        toast.error(data.error || 'Kullanıcı silinemedi');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    }
  };

  // Form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Kullanıcı başarıyla oluşturuldu');
        setIsDialogOpen(false);
        setFormData({
          username: '',
          email: '',
          password: '',
          fullName: '',
          roleId: ''
        });
        await fetchUsers(); // Listeyi yenile
      } else {
        toast.error(data.error || 'Kullanıcı oluşturulamadı');
      }
    } catch (error) {
      toast.error('Bir hata oluştu');
    } finally {
      setFormLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Yükleme durumu
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  // Erişim reddedildi durumu
  if (accessDenied) {
    return (
      <AuthGuard>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Erişim Reddedildi</h2>
            <p className="text-gray-600 mb-4">
              Kullanıcı yönetimi sayfasına erişmek için yönetici yetkiniz olması gerekiyor.
            </p>
            <p className="text-sm text-gray-500">
              Yöneticinize başvurun veya uygun yetkilere sahip bir hesapla giriş yapın.
            </p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <TopNav />
        <main className="max-w-7xl mx-auto p-4">
          <div className="grid gap-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-medium flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Kullanıcı Yönetimi
                </h2>
                <p className="text-sm text-muted-foreground">Sistem kullanıcılarını yönetin ve yetkilendirin.</p>
              </div>
        
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Yeni Kullanıcı
                </Button>
              </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yeni Kullanıcı Oluştur</DialogTitle>
              <DialogDescription>
                Şirketiniz için yeni bir kullanıcı hesabı oluşturun.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="username">Kullanıcı Adı</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  placeholder="kullanici_adi"
                  required
                />
              </div>

              <div>
                <Label htmlFor="email">E-posta</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="ornek@sirket.com"
                  required
                />
              </div>

              <div>
                <Label htmlFor="fullName">Ad Soyad</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  placeholder="Ad Soyad"
                  required
                />
              </div>

              <div>
                <Label htmlFor="password">Şifre</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  placeholder="En az 6 karakter"
                  minLength={6}
                  required
                />
              </div>

              <div>
                <Label htmlFor="role">Rol</Label>
                <Select value={formData.roleId} onValueChange={(value) => setFormData({...formData, roleId: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Bir rol seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id.toString()}>
                        {role.name} - {role.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  İptal
                </Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700" type="submit" disabled={formLoading}>
                  {formLoading ? 'Oluşturuluyor...' : 'Oluştur'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        
        {/* Kullanıcı Düzenleme Dialogı */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Kullanıcı Düzenle</DialogTitle>
              <DialogDescription>
                {editingUser?.full_name} kullanıcısının bilgilerini düzenleyin.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <Label htmlFor="edit-username">Kullanıcı Adı</Label>
                <Input
                  id="edit-username"
                  value={editFormData.username}
                  onChange={(e) => setEditFormData({...editFormData, username: e.target.value})}
                  placeholder="kullanici_adi"
                  required
                />
              </div>

              <div>
                <Label htmlFor="edit-email">E-posta</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                  placeholder="ornek@sirket.com"
                  required
                />
              </div>

              <div>
                <Label htmlFor="edit-fullName">Ad Soyad</Label>
                <Input
                  id="edit-fullName"
                  value={editFormData.fullName}
                  onChange={(e) => setEditFormData({...editFormData, fullName: e.target.value})}
                  placeholder="Ad Soyad"
                  required
                />
              </div>

              <div>
                <Label htmlFor="edit-role">Rol</Label>
                <Select value={editFormData.roleId} onValueChange={(value) => setEditFormData({...editFormData, roleId: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Bir rol seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.filter(role => role.name !== 'admin').map((role) => (
                      <SelectItem key={role.id} value={role.id.toString()}>
                        {role.name} - {role.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-isActive"
                  checked={editFormData.isActive}
                  onCheckedChange={(checked) => setEditFormData({...editFormData, isActive: !!checked})}
                />
                <Label htmlFor="edit-isActive">Kullanıcı Aktif</Label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  İptal
                </Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700" type="submit" disabled={formLoading}>
                  {formLoading ? 'Güncelleniyor...' : 'Güncelle'}
                </Button>
              </div>
            </form>
          </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableCaption>Toplam {users.length} kullanıcı</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kullanıcı</TableHead>
                      <TableHead>E-posta</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Şirket</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead>Oluşturulma</TableHead>
                      <TableHead>Son Giriş</TableHead>
                      <TableHead className="text-right">İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{user.full_name}</p>
                            <p className="text-sm text-muted-foreground">@{user.username}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            {user.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-muted-foreground" />
                            <Badge variant="secondary">{user.role_name}</Badge>
                          </div>
                        </TableCell>
                        <TableCell>{user.company_name || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={user.is_active ? "default" : "secondary"}>
                            {user.is_active ? 'Aktif' : 'Pasif'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {formatDate(user.created_at)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.last_login ? (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {formatDate(user.last_login)}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Henüz giriş yapmadı</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {user.role_name !== 'admin' && (
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="secondary"
                                size="icon"
                                onClick={() => openEditDialog(user)}
                                aria-label="Kullanıcıyı düzenle"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="secondary"
                                size="icon"
                                onClick={() => handleDeleteUser(user)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                aria-label="Kullanıcıyı sil"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
