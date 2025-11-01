'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updateProgramSchema, type UpdateProgramInput } from '@/lib/validators/program';
import { CATEGORIES, DIFFICULTIES, PROGRAM_STATUSES, type Program } from '@/types/program';
import { fetchWithAuth } from '@/lib/api/fetch-with-auth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { DateTimePicker } from '@/components/ui/datetime-picker';
import { Loader2, X, Calendar } from 'lucide-react';
import { ProgramCoverUpload } from './ProgramCoverUpload';

interface EditProgramDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  program: Program | null;
  onSuccess: () => void;
}

export function EditProgramDialog({
  open,
  onOpenChange,
  program,
  onSuccess,
}: EditProgramDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [tagInput, setTagInput] = React.useState('');

  const form = useForm<UpdateProgramInput>({
    resolver: zodResolver(updateProgramSchema),
    defaultValues: {
      title: '',
      description: '',
      category: 'meditation',
      difficulty: 'beginner',
      durationDays: 7,
      status: 'draft',
      tags: [],
      scheduledPublishAt: null,
      scheduledArchiveAt: null,
      autoPublishEnabled: false,
    },
  });

  // Update form when program changes
  React.useEffect(() => {
    if (program) {
      form.reset({
        title: program.title,
        description: program.description,
        category: program.category,
        difficulty: program.difficulty,
        durationDays: program.durationDays,
        status: program.status,
        tags: program.tags || [],
        coverImageUrl: program.coverImageUrl,
        scheduledPublishAt: program.scheduledPublishAt || null,
        scheduledArchiveAt: program.scheduledArchiveAt || null,
        autoPublishEnabled: program.autoPublishEnabled || false,
      });
    }
  }, [program, form]);

  const tags = form.watch('tags') || [];

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase();
      if (!tags.includes(newTag) && tags.length < 10) {
        form.setValue('tags', [...tags, newTag]);
        setTagInput('');
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    form.setValue('tags', tags.filter((tag) => tag !== tagToRemove));
  };

  const onSubmit = async (data: UpdateProgramInput) => {
    if (!program) return;

    setIsSubmitting(true);
    try {
      const response = await fetchWithAuth(`/api/programs/${program.id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update program');
      }

      onOpenChange(false);
      onSuccess();

      toast({
        title: "Program updated",
        description: "The program has been successfully updated.",
      });
    } catch (error: any) {
      console.error('Error updating program:', error);
      toast({
        title: "Error",
        description: error.message || 'Failed to update program',
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!program) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Program</DialogTitle>
          <DialogDescription>
            Update program details and settings
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., 7-Day Meditation Starter"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Begin your meditation journey..."
                      className="min-h-[100px]"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              {/* Category */}
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category} className="capitalize">
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Difficulty */}
              <FormField
                control={form.control}
                name="difficulty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Difficulty</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select difficulty" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DIFFICULTIES.map((difficulty) => (
                          <SelectItem key={difficulty} value={difficulty} className="capitalize">
                            {difficulty}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Duration */}
              <FormField
                control={form.control}
                name="durationDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (days)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={365}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Status */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PROGRAM_STATUSES.map((status) => (
                          <SelectItem key={status} value={status} className="capitalize">
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Scheduling Section */}
            <Separator className="my-6" />
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold">Scheduling (Optional)</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Schedule when this program should be automatically published or archived
              </p>

              {/* Auto-Publish Enabled Toggle */}
              <FormField
                control={form.control}
                name="autoPublishEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Enable Auto-Publishing</FormLabel>
                      <FormDescription>
                        Automatically publish/archive at scheduled times
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Scheduled Publish Date */}
              <FormField
                control={form.control}
                name="scheduledPublishAt"
                render={({ field }) => (
                  <FormItem>
                    <DateTimePicker
                      value={field.value || null}
                      onChange={field.onChange}
                      disabled={isSubmitting}
                      label="Scheduled Publish Date"
                      description="When should this program be automatically published?"
                      minDate={new Date().toISOString()}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Scheduled Archive Date */}
              <FormField
                control={form.control}
                name="scheduledArchiveAt"
                render={({ field }) => (
                  <FormItem>
                    <DateTimePicker
                      value={field.value || null}
                      onChange={field.onChange}
                      disabled={isSubmitting}
                      label="Scheduled Archive Date"
                      description="When should this program be automatically archived?"
                      minDate={form.watch('scheduledPublishAt') || new Date().toISOString()}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator className="my-6" />

            {/* Tags */}
            <FormItem>
              <FormLabel>Tags</FormLabel>
              <FormControl>
                <Input
                  placeholder="Type a tag and press Enter"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  disabled={isSubmitting || tags.length >= 10}
                />
              </FormControl>
              <FormDescription>
                Add up to 10 tags (press Enter to add)
              </FormDescription>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-2 hover:text-destructive"
                        disabled={isSubmitting}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </FormItem>

            {/* Cover Image Upload */}
            <ProgramCoverUpload
              programId={program.id}
              currentUrl={program.coverImageUrl}
              onUpload={(url) => {
                form.setValue('coverImageUrl', url);
                // Don't call onSuccess() here - let the user continue editing
              }}
              onRemove={() => {
                form.setValue('coverImageUrl', null);
                // Don't call onSuccess() here - let the user continue editing
              }}
              disabled={isSubmitting}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
