'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { fetchWithAuth } from '@/lib/api/fetch-with-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Plus, Trash2, GripVertical, Save, Eye, EyeOff, Info, Brain } from 'lucide-react';
import Link from 'next/link';
import type { InformationScreen, DisplayConditions, OnboardingQuestion } from '@/types/onboarding';
import { validateInformationScreen } from '@/types/onboarding';
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
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ScreenForm extends Omit<InformationScreen, 'createdAt' | 'updatedAt'> {
  tempId: string;
}

// Composant pour un écran sortable
function SortableInformationScreen({
  screen,
  index,
  questions,
  onUpdate,
  onRemove,
  onPreview,
}: {
  screen: ScreenForm;
  index: number;
  questions: OnboardingQuestion[];
  onUpdate: (id: string, updates: Partial<ScreenForm>) => void;
  onRemove: (id: string) => void;
  onPreview: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: screen.tempId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [showConditions, setShowConditions] = React.useState(!!screen.displayConditions);

  return (
    <Card ref={setNodeRef} style={style} className="border-2">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
              <GripVertical className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg">
                Écran d&apos;information {index + 1}
              </CardTitle>
              <CardDescription>
                Position {screen.position} • Ordre {screen.order}
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onPreview(screen.tempId)}
              title="Prévisualiser"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onRemove(screen.tempId)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Position et ordre */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Position dans le flux *</Label>
            <Input
              type="number"
              min="0"
              value={screen.position}
              onChange={(e) => onUpdate(screen.tempId, { position: parseInt(e.target.value) })}
              placeholder="0 = avant première question"
            />
            <p className="text-xs text-muted-foreground">
              0 = avant la première question, 1 = après Q1, etc.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Ordre d&apos;affichage *</Label>
            <Input
              type="number"
              min="0"
              value={screen.order}
              onChange={(e) => onUpdate(screen.tempId, { order: parseInt(e.target.value) })}
              placeholder="0, 1, 2..."
            />
            <p className="text-xs text-muted-foreground">
              Si plusieurs écrans à la même position
            </p>
          </div>
        </div>

        {/* Titre */}
        <div className="space-y-2">
          <Label>Titre de l&apos;écran *</Label>
          <Input
            value={screen.title}
            onChange={(e) => onUpdate(screen.tempId, { title: e.target.value })}
            placeholder="Ex: Bienvenue dans votre parcours de bien-être"
            required
          />
        </div>

        {/* Traductions du titre */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Titre (Français)</Label>
            <Input
              value={screen.titleFr || ''}
              onChange={(e) => onUpdate(screen.tempId, { titleFr: e.target.value })}
              placeholder="Titre en français"
            />
          </div>
          <div className="space-y-2">
            <Label>Titre (Anglais)</Label>
            <Input
              value={screen.titleEn || ''}
              onChange={(e) => onUpdate(screen.tempId, { titleEn: e.target.value })}
              placeholder="Title in English"
            />
          </div>
        </div>

        {/* Sous-titre */}
        <div className="space-y-2">
          <Label>Sous-titre</Label>
          <Input
            value={screen.subtitle || ''}
            onChange={(e) => onUpdate(screen.tempId, { subtitle: e.target.value })}
            placeholder="Description courte..."
          />
        </div>

        {/* Contenu */}
        <div className="space-y-2">
          <Label>Contenu</Label>
          <Textarea
            value={screen.content || ''}
            onChange={(e) => onUpdate(screen.tempId, { content: e.target.value })}
            placeholder="Texte enrichi (markdown supporté)..."
            rows={4}
          />
        </div>

        {/* Points clés */}
        <div className="space-y-2">
          <Label>Points clés (un par ligne)</Label>
          <Textarea
            value={screen.bulletPoints?.join('\n') || ''}
            onChange={(e) =>
              onUpdate(screen.tempId, {
                bulletPoints: e.target.value.split('\n').filter(line => line.trim() !== ''),
              })
            }
            placeholder="✓ Premier point&#10;✓ Deuxième point&#10;✓ Troisième point"
            rows={3}
          />
        </div>

        {/* URL d'image et couleur de fond */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>URL de l&apos;image</Label>
            <Input
              value={screen.imageUrl || ''}
              onChange={(e) => onUpdate(screen.tempId, { imageUrl: e.target.value })}
              placeholder="https://..."
            />
          </div>
          <div className="space-y-2">
            <Label>Couleur de fond</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={screen.backgroundColor || '#FFFFFF'}
                onChange={(e) => onUpdate(screen.tempId, { backgroundColor: e.target.value })}
                className="w-20"
              />
              <Input
                value={screen.backgroundColor || ''}
                onChange={(e) => onUpdate(screen.tempId, { backgroundColor: e.target.value })}
                placeholder="#FFFFFF"
                className="flex-1"
              />
            </div>
          </div>
        </div>

        {/* Texte du bouton CTA */}
        <div className="space-y-2">
          <Label>Texte du bouton</Label>
          <Input
            value={screen.ctaText || ''}
            onChange={(e) => onUpdate(screen.tempId, { ctaText: e.target.value })}
            placeholder="Continuer"
          />
        </div>

        {/* Conditions d'affichage */}
        <div className="space-y-2 p-4 bg-muted/50 rounded-md">
          <div className="flex items-center justify-between">
            <Label>Conditions d&apos;affichage</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowConditions(!showConditions)}
            >
              {showConditions ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>

          {showConditions && (
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Si réponse à la question</Label>
                <select
                  className="w-full px-3 py-2 border rounded-md"
                  value={screen.displayConditions?.showIfAnswer || ''}
                  onChange={(e) =>
                    onUpdate(screen.tempId, {
                      displayConditions: {
                        ...screen.displayConditions,
                        showIfAnswer: e.target.value || undefined,
                      },
                    })
                  }
                >
                  <option value="">Aucune condition</option>
                  {questions.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.title}
                    </option>
                  ))}
                </select>
              </div>

              {screen.displayConditions?.showIfAnswer && (
                <div className="space-y-2">
                  <Label>Valeur attendue</Label>
                  <Input
                    value={
                      Array.isArray(screen.displayConditions.expectedAnswer)
                        ? screen.displayConditions.expectedAnswer.join(', ')
                        : screen.displayConditions.expectedAnswer || ''
                    }
                    onChange={(e) =>
                      onUpdate(screen.tempId, {
                        displayConditions: {
                          ...screen.displayConditions,
                          expectedAnswer: e.target.value.split(',').map(v => v.trim()),
                        },
                      })
                    }
                    placeholder="Valeur ou valeurs séparées par virgule"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Si objectif sélectionné</Label>
                <Input
                  value={screen.displayConditions?.showIfGoal || ''}
                  onChange={(e) =>
                    onUpdate(screen.tempId, {
                      displayConditions: {
                        ...screen.displayConditions,
                        showIfGoal: e.target.value || undefined,
                      },
                    })
                  }
                  placeholder="ID de l'objectif"
                />
              </div>

              <div className="space-y-2">
                <Label>Si niveau d&apos;expérience</Label>
                <select
                  className="w-full px-3 py-2 border rounded-md"
                  value={screen.displayConditions?.showIfExperience || ''}
                  onChange={(e) =>
                    onUpdate(screen.tempId, {
                      displayConditions: {
                        ...screen.displayConditions,
                        showIfExperience: (e.target.value as any) || undefined,
                      },
                    })
                  }
                >
                  <option value="">Aucune condition</option>
                  <option value="beginner">Débutant</option>
                  <option value="intermediate">Intermédiaire</option>
                  <option value="advanced">Avancé</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function InformationScreensPage() {
  const router = useRouter();
  const params = useParams();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = React.useState(true);
  const [configTitle, setConfigTitle] = React.useState('');
  const [questions, setQuestions] = React.useState<OnboardingQuestion[]>([]);
  const [screens, setScreens] = React.useState<ScreenForm[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [previewScreenId, setPreviewScreenId] = React.useState<string | null>(null);

  // Drag & drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Charger la configuration et les écrans
  React.useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') {
      router.push('/admin/onboarding');
      return;
    }

    const fetchData = async () => {
      try {
        const response = await fetchWithAuth(`/api/admin/onboarding/${params.id}`);
        if (response.ok) {
          const data = await response.json();
          setConfigTitle(data.title);
          setQuestions(data.questions || []);
          setScreens(
            (data.informationScreens || []).map((s: InformationScreen) => ({
              ...s,
              tempId: s.id || `temp_${Date.now()}_${Math.random()}`,
            }))
          );
        } else {
          toast({
            title: 'Erreur',
            description: 'Configuration introuvable',
            variant: 'destructive',
          });
          router.push('/admin/onboarding');
        }
      } catch (error) {
        toast({
          title: 'Erreur',
          description: 'Erreur lors du chargement',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchData();
    }
  }, [currentUser, params.id, router, toast]);

  const addScreen = () => {
    const newScreen: ScreenForm = {
      tempId: `temp_${Date.now()}`,
      id: '',
      position: 0,
      title: '',
      order: screens.length,
    };
    setScreens([...screens, newScreen]);
  };

  const removeScreen = (tempId: string) => {
    setScreens(screens.filter((s) => s.tempId !== tempId));
  };

  const updateScreen = (tempId: string, updates: Partial<ScreenForm>) => {
    setScreens(screens.map((s) => (s.tempId === tempId ? { ...s, ...updates } : s)));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setScreens((items) => {
        const oldIndex = items.findIndex((item) => item.tempId === active.id);
        const newIndex = items.findIndex((item) => item.tempId === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handlePreview = (tempId: string) => {
    setPreviewScreenId(tempId);
    // TODO: Implémenter la prévisualisation
    toast({
      title: 'Prévisualisation',
      description: 'Fonctionnalité à venir',
    });
  };

  const handleSave = async () => {
    // Validation
    const errors: string[] = [];
    screens.forEach((screen, index) => {
      const validation = validateInformationScreen(screen);
      if (!validation.isValid) {
        errors.push(`Écran ${index + 1}: ${validation.errors.map(e => e.message).join(', ')}`);
      }
    });

    if (errors.length > 0) {
      toast({
        title: 'Erreurs de validation',
        description: errors.join('\n'),
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetchWithAuth(`/api/admin/onboarding/${params.id}/information-screens`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          informationScreens: screens.map((s, index) => ({
            id: s.id || `info_screen_${Date.now()}_${index}`,
            position: s.position,
            title: s.title,
            titleFr: s.titleFr,
            titleEn: s.titleEn,
            subtitle: s.subtitle,
            subtitleFr: s.subtitleFr,
            subtitleEn: s.subtitleEn,
            content: s.content,
            contentFr: s.contentFr,
            contentEn: s.contentEn,
            bulletPoints: s.bulletPoints,
            bulletPointsFr: s.bulletPointsFr,
            bulletPointsEn: s.bulletPointsEn,
            imageUrl: s.imageUrl,
            ctaText: s.ctaText,
            ctaTextFr: s.ctaTextFr,
            ctaTextEn: s.ctaTextEn,
            backgroundColor: s.backgroundColor,
            displayConditions: s.displayConditions,
            order: index,
          })),
        }),
      });

      if (response.ok) {
        toast({
          title: 'Succès',
          description: 'Écrans d\'information mis à jour',
        });
        router.refresh();
      } else {
        const error = await response.json();
        toast({
          title: 'Erreur',
          description: error.error || 'Erreur lors de la sauvegarde',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/admin/onboarding/${params.id}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Écrans d&apos;information</h1>
            <p className="text-muted-foreground">{configTitle}</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <Card>
        <CardContent className="p-0">
          <div className="flex border-b">
            <Link
              href={`/admin/onboarding/${params.id}`}
              className="flex-1 py-3 px-4 text-center border-b-2 border-transparent hover:border-muted-foreground/20 text-muted-foreground hover:text-foreground transition-colors"
            >
              Questions
            </Link>
            <Link
              href={`/admin/onboarding/${params.id}/information-screens`}
              className="flex-1 py-3 px-4 text-center border-b-2 border-primary font-medium text-primary flex items-center justify-center gap-2"
            >
              <Info className="h-4 w-4" />
              Écrans d&apos;information
            </Link>
            <Link
              href="/admin/onboarding/recommendation-rules"
              className="flex-1 py-3 px-4 text-center border-b-2 border-transparent hover:border-muted-foreground/20 text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-2"
            >
              <Brain className="h-4 w-4" />
              Règles de recommandation
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {/* Écrans avec drag & drop */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Écrans d&apos;information</CardTitle>
                <CardDescription>
                  {screens.length} écran{screens.length !== 1 ? 's' : ''} • Glisser-déposer pour réorganiser
                </CardDescription>
              </div>
              <Button type="button" onClick={addScreen} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un écran
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {screens.length === 0 ? (
              <div className="text-center p-12 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">
                  Aucun écran d&apos;information. Cliquez sur &quot;Ajouter un écran&quot; pour commencer.
                </p>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={screens.map((s) => s.tempId)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-4">
                    {screens.map((screen, index) => (
                      <SortableInformationScreen
                        key={screen.tempId}
                        screen={screen}
                        index={index}
                        questions={questions}
                        onUpdate={updateScreen}
                        onRemove={removeScreen}
                        onPreview={handlePreview}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Link href={`/admin/onboarding/${params.id}`}>
            <Button type="button" variant="outline">
              Annuler
            </Button>
          </Link>
          <Button onClick={handleSave} disabled={isSubmitting}>
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </div>
      </div>
    </div>
  );
}
