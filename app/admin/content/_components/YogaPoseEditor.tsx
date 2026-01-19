'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TranslationFieldsWithAutoTranslate } from '@/components/ui/translation-fields-with-auto-translate';
import {
  Plus,
  Trash2,
  GripVertical,
  Clock,
  ChevronUp,
  ChevronDown,
  Copy,
} from 'lucide-react';
import type { YogaPose, YogaPoseSide, MultilingualText } from '@/types/lesson';
import { YOGA_TARGET_ZONES } from '@/types/lesson';

interface YogaPoseEditorProps {
  poses: YogaPose[];
  onChange: (poses: YogaPose[]) => void;
  lessonDurationSec: number | null;
  disabled?: boolean;
}

const SIDE_OPTIONS: { value: YogaPoseSide; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'both', label: 'Both sides' },
];

const DIFFICULTY_OPTIONS = [
  { value: 1, label: 'Beginner' },
  { value: 2, label: 'Intermediate' },
  { value: 3, label: 'Advanced' },
];

const TARGET_ZONE_LABELS: Record<string, string> = {
  back: 'Back',
  legs: 'Legs',
  hips: 'Hips',
  shoulders: 'Shoulders',
  arms: 'Arms',
  core: 'Core',
  spine: 'Spine',
  hamstrings: 'Hamstrings',
  calves: 'Calves',
  chest: 'Chest',
  neck: 'Neck',
  glutes: 'Glutes',
  full_body: 'Full Body',
};

function createEmptyPose(startTimeMs: number = 0): YogaPose {
  return {
    startTimeMs,
    endTimeMs: startTimeMs + 60000, // 1 minute default
    title: { fr: '' },
    stimulus: { fr: '' },
    instructions: [{ fr: '' }],
    targetZones: [],
    side: 'none',
  };
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function parseTime(timeStr: string): number {
  const parts = timeStr.split(':');
  if (parts.length !== 2) return 0;
  const minutes = parseInt(parts[0], 10) || 0;
  const seconds = parseInt(parts[1], 10) || 0;
  return (minutes * 60 + seconds) * 1000;
}

function getDisplayText(text: MultilingualText | string | undefined): string {
  if (!text) return '';
  if (typeof text === 'string') return text;
  return text.fr || text.en || text.es || '';
}

export function YogaPoseEditor({
  poses,
  onChange,
  lessonDurationSec,
  disabled = false,
}: YogaPoseEditorProps) {
  const [editingPose, setEditingPose] = React.useState<{
    index: number;
    pose: YogaPose;
  } | null>(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  const maxDurationMs = (lessonDurationSec || 3600) * 1000;

  const handleAddPose = () => {
    // Find the end time of the last pose, or start at 0
    const lastEndTime =
      poses.length > 0 ? Math.max(...poses.map((p) => p.endTimeMs)) : 0;
    const newPose = createEmptyPose(lastEndTime);

    // Ensure end time doesn't exceed lesson duration
    if (newPose.endTimeMs > maxDurationMs) {
      newPose.endTimeMs = maxDurationMs;
    }

    setEditingPose({ index: poses.length, pose: newPose });
    setIsDialogOpen(true);
  };

  const handleEditPose = (index: number) => {
    setEditingPose({ index, pose: { ...poses[index] } });
    setIsDialogOpen(true);
  };

  const handleDeletePose = (index: number) => {
    const newPoses = poses.filter((_, i) => i !== index);
    onChange(newPoses);
  };

  const handleDuplicatePose = (index: number) => {
    const poseToDuplicate = poses[index];
    const newPose: YogaPose = {
      ...poseToDuplicate,
      startTimeMs: poseToDuplicate.endTimeMs,
      endTimeMs: Math.min(
        poseToDuplicate.endTimeMs + (poseToDuplicate.endTimeMs - poseToDuplicate.startTimeMs),
        maxDurationMs
      ),
      title: { ...poseToDuplicate.title },
      stimulus: { ...poseToDuplicate.stimulus },
      instructions: poseToDuplicate.instructions.map((i) => ({ ...i })),
      benefits: poseToDuplicate.benefits?.map((b) => ({ ...b })),
    };

    const newPoses = [...poses];
    newPoses.splice(index + 1, 0, newPose);
    onChange(newPoses);
  };

  const handleMovePose = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= poses.length) return;

    const newPoses = [...poses];
    [newPoses[index], newPoses[newIndex]] = [newPoses[newIndex], newPoses[index]];
    onChange(newPoses);
  };

  const handleSavePose = () => {
    if (!editingPose) return;

    const newPoses = [...poses];
    if (editingPose.index < poses.length) {
      newPoses[editingPose.index] = editingPose.pose;
    } else {
      newPoses.push(editingPose.pose);
    }

    // Sort poses by start time
    newPoses.sort((a, b) => a.startTimeMs - b.startTimeMs);

    onChange(newPoses);
    setIsDialogOpen(false);
    setEditingPose(null);
  };

  const handleUpdateEditingPose = (updates: Partial<YogaPose>) => {
    if (!editingPose) return;
    setEditingPose({
      ...editingPose,
      pose: { ...editingPose.pose, ...updates },
    });
  };

  const handleAddInstruction = () => {
    if (!editingPose) return;
    const newInstructions = [...editingPose.pose.instructions, { fr: '' }];
    handleUpdateEditingPose({ instructions: newInstructions });
  };

  const handleUpdateInstruction = (index: number, value: MultilingualText) => {
    if (!editingPose) return;
    const newInstructions = [...editingPose.pose.instructions];
    newInstructions[index] = value;
    handleUpdateEditingPose({ instructions: newInstructions });
  };

  const handleDeleteInstruction = (index: number) => {
    if (!editingPose || editingPose.pose.instructions.length <= 1) return;
    const newInstructions = editingPose.pose.instructions.filter((_, i) => i !== index);
    handleUpdateEditingPose({ instructions: newInstructions });
  };

  const handleToggleTargetZone = (zone: string) => {
    if (!editingPose) return;
    const currentZones = editingPose.pose.targetZones;
    const newZones = currentZones.includes(zone)
      ? currentZones.filter((z) => z !== zone)
      : [...currentZones, zone];
    handleUpdateEditingPose({ targetZones: newZones });
  };

  // Calculate total coverage
  const totalCoverageMs = poses.reduce((sum, pose) => sum + (pose.endTimeMs - pose.startTimeMs), 0);
  const coveragePercent = maxDurationMs > 0 ? Math.round((totalCoverageMs / maxDurationMs) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base font-semibold">Yoga Poses</Label>
          <p className="text-sm text-muted-foreground">
            Define the poses/chapters for this yoga session
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {poses.length} pose{poses.length !== 1 ? 's' : ''}
          </Badge>
          <Badge variant={coveragePercent >= 90 ? 'default' : 'secondary'}>
            {coveragePercent}% coverage
          </Badge>
        </div>
      </div>

      {/* Timeline visualization */}
      {poses.length > 0 && maxDurationMs > 0 && (
        <div className="relative h-8 bg-muted rounded-md overflow-hidden">
          {poses.map((pose, index) => {
            const left = (pose.startTimeMs / maxDurationMs) * 100;
            const width = ((pose.endTimeMs - pose.startTimeMs) / maxDurationMs) * 100;
            return (
              <div
                key={index}
                className="absolute h-full bg-primary/70 hover:bg-primary cursor-pointer transition-colors"
                style={{ left: `${left}%`, width: `${width}%` }}
                onClick={() => handleEditPose(index)}
                title={`${getDisplayText(pose.title)} (${formatTime(pose.startTimeMs)} - ${formatTime(pose.endTimeMs)})`}
              />
            );
          })}
        </div>
      )}

      {/* Pose list */}
      <div className="space-y-2">
        {poses.map((pose, index) => (
          <Card key={index} className="relative">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleMovePose(index, 'up')}
                    disabled={disabled || index === 0}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleMovePose(index, 'down')}
                    disabled={disabled || index === poses.length - 1}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>

                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => handleEditPose(index)}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {getDisplayText(pose.title) || `Pose ${index + 1}`}
                    </span>
                    {pose.side !== 'none' && (
                      <Badge variant="outline" className="text-xs">
                        {pose.side === 'left' ? 'L' : pose.side === 'right' ? 'R' : 'L/R'}
                      </Badge>
                    )}
                    {pose.difficulty && (
                      <Badge variant="secondary" className="text-xs">
                        {DIFFICULTY_OPTIONS.find((d) => d.value === pose.difficulty)?.label}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>
                      {formatTime(pose.startTimeMs)} - {formatTime(pose.endTimeMs)}
                    </span>
                    <span className="text-xs">
                      ({Math.round((pose.endTimeMs - pose.startTimeMs) / 1000)}s)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDuplicatePose(index)}
                    disabled={disabled}
                    title="Duplicate pose"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDeletePose(index)}
                    disabled={disabled}
                    title="Delete pose"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={handleAddPose}
        disabled={disabled || poses.length >= 50}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Pose
      </Button>

      {poses.length >= 50 && (
        <p className="text-sm text-muted-foreground text-center">
          Maximum 50 poses per lesson reached
        </p>
      )}

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPose && editingPose.index < poses.length ? 'Edit Pose' : 'Add Pose'}
            </DialogTitle>
            <DialogDescription>
              Define the timing, title, and instructions for this pose
            </DialogDescription>
          </DialogHeader>

          {editingPose && (
            <div className="space-y-6">
              {/* Timing */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Time (mm:ss)</Label>
                  <Input
                    type="text"
                    placeholder="00:00"
                    value={formatTime(editingPose.pose.startTimeMs)}
                    onChange={(e) =>
                      handleUpdateEditingPose({ startTimeMs: parseTime(e.target.value) })
                    }
                    disabled={disabled}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Time (mm:ss)</Label>
                  <Input
                    type="text"
                    placeholder="01:00"
                    value={formatTime(editingPose.pose.endTimeMs)}
                    onChange={(e) =>
                      handleUpdateEditingPose({ endTimeMs: parseTime(e.target.value) })
                    }
                    disabled={disabled}
                  />
                </div>
              </div>

              {/* Title */}
              <TranslationFieldsWithAutoTranslate
                label="Title"
                value={editingPose.pose.title}
                onChange={(value) => handleUpdateEditingPose({ title: value })}
                disabled={disabled}
                required
                placeholder={{
                  fr: 'Ex: Chien tête en bas',
                  en: 'Ex: Downward-Facing Dog',
                  es: 'Ex: Perro boca abajo',
                }}
                maxLength={100}
              />

              {/* Stimulus / Description */}
              <TranslationFieldsWithAutoTranslate
                type="textarea"
                label="Stimulus / Description"
                value={editingPose.pose.stimulus}
                onChange={(value) => handleUpdateEditingPose({ stimulus: value })}
                disabled={disabled}
                required
                placeholder={{
                  fr: 'Ex: Étirement profond du dos et des jambes',
                  en: 'Ex: Deep stretch of back and legs',
                  es: 'Ex: Estiramiento profundo de espalda y piernas',
                }}
                rows={2}
                maxLength={300}
              />

              {/* Instructions */}
              <div className="space-y-3">
                <Label>Instructions</Label>
                {editingPose.pose.instructions.map((instruction, index) => (
                  <div key={index} className="flex gap-2">
                    <div className="flex-1">
                      <TranslationFieldsWithAutoTranslate
                        label={`Step ${index + 1}`}
                        value={instruction}
                        onChange={(value) => handleUpdateInstruction(index, value)}
                        disabled={disabled}
                        placeholder={{
                          fr: 'Instruction en français...',
                          en: 'Instruction in English...',
                          es: 'Instrucción en español...',
                        }}
                        maxLength={200}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteInstruction(index)}
                      disabled={disabled || editingPose.pose.instructions.length <= 1}
                      className="mt-8"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddInstruction}
                  disabled={disabled}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Instruction
                </Button>
              </div>

              {/* Side */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Side (for bilateral poses)</Label>
                  <Select
                    value={editingPose.pose.side}
                    onValueChange={(value) =>
                      handleUpdateEditingPose({ side: value as YogaPoseSide })
                    }
                    disabled={disabled}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SIDE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Difficulty</Label>
                  <Select
                    value={editingPose.pose.difficulty?.toString() || ''}
                    onValueChange={(value) =>
                      handleUpdateEditingPose({
                        difficulty: value ? parseInt(value, 10) : undefined,
                      })
                    }
                    disabled={disabled}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      {DIFFICULTY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value.toString()}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Target Zones */}
              <div className="space-y-2">
                <Label>Target Zones</Label>
                <div className="flex flex-wrap gap-2">
                  {YOGA_TARGET_ZONES.map((zone) => (
                    <Badge
                      key={zone}
                      variant={
                        editingPose.pose.targetZones.includes(zone) ? 'default' : 'outline'
                      }
                      className="cursor-pointer"
                      onClick={() => !disabled && handleToggleTargetZone(zone)}
                    >
                      {TARGET_ZONE_LABELS[zone] || zone}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={disabled}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSavePose}
              disabled={
                disabled ||
                !editingPose?.pose.title?.fr ||
                !editingPose?.pose.stimulus?.fr
              }
            >
              {editingPose && editingPose.index < poses.length ? 'Update Pose' : 'Add Pose'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
