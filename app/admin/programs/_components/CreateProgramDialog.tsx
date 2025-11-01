'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createProgramSchema, type CreateProgramInput } from '@/lib/validators/program';
import { CATEGORIES, DIFFICULTIES, type Category, type Difficulty } from '@/types/program';
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

interface CreateProgramDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateProgramDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateProgramDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [tagInput, setTagInput] = React.useState('');

  const form = useForm<CreateProgramInput>({
    resolver: zodResolver(createProgramSchema),
    defaultValues: {
      title: '',
      description: '',
      category: 'meditation',
      difficulty: 'beginner',
      durationDays: 7,
      tags: [],
      lessons: [],
      scheduledPublishAt: null,
      scheduledArchiveAt: null,
      autoPublishEnabled: false,
    },
  });

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

  const onSubmit = async (data: CreateProgramInput) => {
    setIsSubmitting(true);
    try {
      const response = await fetchWithAuth('/api/programs', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create program');
      }

      // Reset form and close dialog
      form.reset();
      onOpenChange(false);
      onSuccess();

      toast({
        title: "Program created",
        description: "The program has been successfully created.",
      });
    } catch (error: any) {
      console.error('Error creating program:', error);
      toast({
        title: "Error",
        description: error.message || 'Failed to create program',
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Program</DialogTitle>
          <DialogDescription>
            Create a structured learning program with lessons and content
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
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., 7-Day Meditation Starter"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormDescription>
                    A clear, descriptive title for your program (3-100 characters)
                  </FormDescription>
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
                  <FormLabel>Description *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Begin your meditation journey with guided sessions..."
                      className="min-h-[100px]"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormDescription>
                    Describe what users will learn and achieve (10-1000 characters)
                  </FormDescription>
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
                    <FormLabel>Category *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
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
                    <FormLabel>Difficulty *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
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

            {/* Duration */}
            <FormField
              control={form.control}
              name="durationDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration (days) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={365}
                      placeholder="7"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormDescription>
                    Program duration in days (1-365)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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
              <FormLabel>Tags (optional)</FormLabel>
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
                Add up to 10 tags (e.g., stress, sleep, focus)
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
                Create Program
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
