'use client';

import * as React from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { hasPermission } from '@/lib/rbac';
import { fetchWithAuth } from '@/lib/api/fetch-with-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, RefreshCw, Pencil, Trash2, ArrowUp, ArrowDown, Globe } from 'lucide-react';
import { toast } from '@/lib/hooks/use-toast';
import type { SubcategoryWithCount } from '@/types/subcategory';
import type { LessonCategory } from '@/types/lesson';

const CATEGORY_OPTIONS: { value: LessonCategory; label: string }[] = [
  { value: 'yoga', label: 'Yoga' },
  { value: 'pilates', label: 'Pilates (Yoga Fit)' },
  { value: 'meditation', label: 'Meditation' },
  { value: 'respiration', label: 'Breathing' },
  { value: 'auto-massage', label: 'Self-Massage' },
];

interface SubcategoryFormData {
  category: LessonCategory;
  nameFr: string;
  nameEn: string;
  nameEs: string;
  descriptionFr: string;
  descriptionEn: string;
  descriptionEs: string;
  slug: string;
  displayOrder: number;
  status: 'active' | 'inactive';
}

const initialFormData: SubcategoryFormData = {
  category: 'yoga',
  nameFr: '',
  nameEn: '',
  nameEs: '',
  descriptionFr: '',
  descriptionEn: '',
  descriptionEs: '',
  slug: '',
  displayOrder: 0,
  status: 'active',
};

export default function SubcategoriesPage() {
  const { user: currentUser } = useAuth();
  const [subcategories, setSubcategories] = React.useState<SubcategoryWithCount[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [categoryFilter, setCategoryFilter] = React.useState<string>('all');

  // Dialog state
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [subcategoryToDelete, setSubcategoryToDelete] = React.useState<string | null>(null);
  const [formData, setFormData] = React.useState<SubcategoryFormData>(initialFormData);
  const [saving, setSaving] = React.useState(false);
  const [translating, setTranslating] = React.useState(false);

  const isAdmin = currentUser?.role === 'admin';

  // Fetch subcategories
  const fetchSubcategories = React.useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ includeCounts: 'true' });
      if (categoryFilter !== 'all') {
        params.set('category', categoryFilter);
      }
      const response = await fetchWithAuth(`/api/subcategories?${params}`);
      if (response.ok) {
        const data = await response.json();
        setSubcategories(data.subcategories || []);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to fetch subcategories',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch subcategories',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [categoryFilter]);

  React.useEffect(() => {
    fetchSubcategories();
  }, [fetchSubcategories]);

  // Handle create/edit
  const handleOpenDialog = (subcategory?: SubcategoryWithCount) => {
    if (subcategory) {
      setEditingId(subcategory.id);
      setFormData({
        category: subcategory.category,
        nameFr: subcategory.name.fr,
        nameEn: subcategory.name.en || '',
        nameEs: subcategory.name.es || '',
        descriptionFr: subcategory.description?.fr || '',
        descriptionEn: subcategory.description?.en || '',
        descriptionEs: subcategory.description?.es || '',
        slug: subcategory.slug,
        displayOrder: subcategory.displayOrder,
        status: subcategory.status,
      });
    } else {
      setEditingId(null);
      setFormData(initialFormData);
    }
    setDialogOpen(true);
  };

  // Auto-translate
  const handleTranslate = async () => {
    if (!formData.nameFr.trim()) {
      toast({
        title: 'Warning',
        description: 'Please enter the French name first',
        variant: 'destructive',
      });
      return;
    }

    setTranslating(true);
    try {
      const response = await fetchWithAuth('/api/translate', {
        method: 'POST',
        body: JSON.stringify({
          text: formData.nameFr,
          targetLanguages: ['en', 'es'],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setFormData((prev) => ({
          ...prev,
          nameEn: data.translations?.en || prev.nameEn,
          nameEs: data.translations?.es || prev.nameEs,
        }));

        // Translate description if present
        if (formData.descriptionFr.trim()) {
          const descResponse = await fetchWithAuth('/api/translate', {
            method: 'POST',
            body: JSON.stringify({
              text: formData.descriptionFr,
              targetLanguages: ['en', 'es'],
            }),
          });

          if (descResponse.ok) {
            const descData = await descResponse.json();
            setFormData((prev) => ({
              ...prev,
              descriptionEn: descData.translations?.en || prev.descriptionEn,
              descriptionEs: descData.translations?.es || prev.descriptionEs,
            }));
          }
        }

        toast({
          title: 'Success',
          description: 'Translations generated',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to translate',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Translation error:', error);
      toast({
        title: 'Error',
        description: 'Failed to translate',
        variant: 'destructive',
      });
    } finally {
      setTranslating(false);
    }
  };

  // Save subcategory
  const handleSave = async () => {
    if (!formData.nameFr.trim()) {
      toast({
        title: 'Validation Error',
        description: 'French name is required',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        category: formData.category,
        name: {
          fr: formData.nameFr,
          en: formData.nameEn || undefined,
          es: formData.nameEs || undefined,
        },
        description: formData.descriptionFr
          ? {
              fr: formData.descriptionFr,
              en: formData.descriptionEn || undefined,
              es: formData.descriptionEs || undefined,
            }
          : undefined,
        slug: formData.slug || undefined,
        displayOrder: formData.displayOrder,
        status: formData.status,
      };

      const url = editingId ? `/api/subcategories/${editingId}` : '/api/subcategories';
      const method = editingId ? 'PATCH' : 'POST';

      const response = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: editingId ? 'Subcategory updated' : 'Subcategory created',
        });
        setDialogOpen(false);
        fetchSubcategories();
      } else {
        const errorData = await response.json();
        toast({
          title: 'Error',
          description: errorData.error || 'Failed to save subcategory',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error saving subcategory:', error);
      toast({
        title: 'Error',
        description: 'Failed to save subcategory',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Delete subcategory
  const handleDelete = (id: string) => {
    setSubcategoryToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!subcategoryToDelete) return;

    try {
      const response = await fetchWithAuth(`/api/subcategories/${subcategoryToDelete}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Subcategory deleted',
        });
        fetchSubcategories();
      } else {
        const errorData = await response.json();
        toast({
          title: 'Error',
          description: errorData.error || 'Failed to delete subcategory',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting subcategory:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete subcategory',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setSubcategoryToDelete(null);
    }
  };

  // Reorder subcategory
  const handleReorder = async (id: string, direction: 'up' | 'down') => {
    const index = subcategories.findIndex((s) => s.id === id);
    if (index === -1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= subcategories.length) return;

    // Swap display orders
    const currentOrder = subcategories[index].displayOrder;
    const targetOrder = subcategories[targetIndex].displayOrder;

    try {
      await Promise.all([
        fetchWithAuth(`/api/subcategories/${subcategories[index].id}`, {
          method: 'PATCH',
          body: JSON.stringify({ displayOrder: targetOrder }),
        }),
        fetchWithAuth(`/api/subcategories/${subcategories[targetIndex].id}`, {
          method: 'PATCH',
          body: JSON.stringify({ displayOrder: currentOrder }),
        }),
      ]);
      fetchSubcategories();
    } catch (error) {
      console.error('Error reordering:', error);
      toast({
        title: 'Error',
        description: 'Failed to reorder subcategories',
        variant: 'destructive',
      });
    }
  };

  const getCategoryLabel = (category: string) => {
    return CATEGORY_OPTIONS.find((c) => c.value === category)?.label || category;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subcategories</h1>
          <p className="text-muted-foreground">
            Manage subcategories for organizing lessons in horizontal carousels
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchSubcategories} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => handleOpenDialog()} disabled={!isAdmin}>
            <Plus className="mr-2 h-4 w-4" />
            Add Subcategory
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Subcategories</CardTitle>
              <CardDescription>
                {subcategories.length} subcategories total
              </CardDescription>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORY_OPTIONS.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : subcategories.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No subcategories found. Create one to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Order</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Name (FR)</TableHead>
                  <TableHead>Name (EN)</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Lessons</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subcategories.map((sub, index) => (
                  <TableRow key={sub.id}>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleReorder(sub.id, 'up')}
                          disabled={index === 0 || !isAdmin}
                        >
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleReorder(sub.id, 'down')}
                          disabled={index === subcategories.length - 1 || !isAdmin}
                        >
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getCategoryLabel(sub.category)}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{sub.name.fr}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {sub.name.en || '-'}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{sub.slug}</TableCell>
                    <TableCell>{sub.lessonsCount}</TableCell>
                    <TableCell>
                      <Badge variant={sub.status === 'active' ? 'default' : 'secondary'}>
                        {sub.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(sub)}
                        disabled={!isAdmin}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(sub.id)}
                        disabled={!isAdmin || sub.lessonsCount > 0}
                        title={sub.lessonsCount > 0 ? 'Cannot delete - has assigned lessons' : ''}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Edit Subcategory' : 'Create Subcategory'}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Update the subcategory details below'
                : 'Fill in the details for the new subcategory'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, category: value as LessonCategory }))
                }
                disabled={!!editingId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Name (Multilingual)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTranslate}
                  disabled={translating || !formData.nameFr}
                >
                  <Globe className="mr-2 h-4 w-4" />
                  {translating ? 'Translating...' : 'Auto-translate'}
                </Button>
              </div>
              <div className="grid gap-2">
                <div className="flex items-center gap-2">
                  <Label className="w-10 text-right text-muted-foreground">FR</Label>
                  <Input
                    value={formData.nameFr}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, nameFr: e.target.value }))
                    }
                    placeholder="French name (required)"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="w-10 text-right text-muted-foreground">EN</Label>
                  <Input
                    value={formData.nameEn}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, nameEn: e.target.value }))
                    }
                    placeholder="English name"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="w-10 text-right text-muted-foreground">ES</Label>
                  <Input
                    value={formData.nameEs}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, nameEs: e.target.value }))
                    }
                    placeholder="Spanish name"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <div className="grid gap-2">
                <div className="flex items-center gap-2">
                  <Label className="w-10 text-right text-muted-foreground">FR</Label>
                  <Input
                    value={formData.descriptionFr}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, descriptionFr: e.target.value }))
                    }
                    placeholder="French description"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="w-10 text-right text-muted-foreground">EN</Label>
                  <Input
                    value={formData.descriptionEn}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, descriptionEn: e.target.value }))
                    }
                    placeholder="English description"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="w-10 text-right text-muted-foreground">ES</Label>
                  <Input
                    value={formData.descriptionEs}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, descriptionEs: e.target.value }))
                    }
                    placeholder="Spanish description"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, slug: e.target.value }))
                  }
                  placeholder="auto-generated"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="displayOrder">Display Order</Label>
                <Input
                  id="displayOrder"
                  type="number"
                  min={0}
                  value={formData.displayOrder}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      displayOrder: parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    status: value as 'active' | 'inactive',
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subcategory?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The subcategory will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
