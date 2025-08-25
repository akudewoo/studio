'use client';
import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useSettings, type IconType } from '@/hooks/use-settings';
import { getIcon } from '@/components/icons/icons';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

const settingsSchema = z.object({
  appName: z.string().min(1, { message: 'Nama aplikasi harus diisi' }),
  appIcon: z.enum(['default', 'package', 'git-branch', 'briefcase']),
  primaryColor: z.string(),
  sidebarOpen: z.boolean(),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

const colorOptions = [
    { label: 'Indigo (Default)', value: '275 100% 25%' },
    { label: 'Slate', value: '215 28% 47%' },
    { label: 'Red', value: '0 72% 51%' },
    { label: 'Green', value: '142 76% 36%' },
    { label: 'Blue', value: '221 83% 53%' },
];

const iconOptions: { label: string, value: IconType }[] = [
    { label: 'Default', value: 'default' },
    { label: 'Package', value: 'package' },
    { label: 'Git Branch', value: 'git-branch' },
    { label: 'Briefcase', value: 'briefcase' },
];

export default function PengaturanPage() {
    const { settings, setSettings, isLoaded } = useSettings();
    const { toast } = useToast();
    
    const form = useForm<SettingsFormValues>({
        resolver: zodResolver(settingsSchema),
        values: settings, // populate form with current settings
    });

    React.useEffect(() => {
        if(isLoaded){
            form.reset(settings);
        }
    }, [isLoaded, settings, form]);

    const onSubmit = (data: SettingsFormValues) => {
        setSettings(data);
        toast({
            title: 'Pengaturan Disimpan',
            description: 'Pengaturan aplikasi Anda telah berhasil diperbarui.',
        });
    };

    if (!isLoaded) {
        return <div>Loading settings...</div>;
    }

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
            <h1 className="font-headline text-lg font-semibold md:text-2xl">Pengaturan</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Kustomisasi Tampilan</CardTitle>
                    <CardDescription>Ubah tampilan aplikasi sesuai preferensi Anda.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                            <FormField
                                control={form.control}
                                name="appName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nama Aplikasi</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Nama aplikasi Anda" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="appIcon"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Ikon Aplikasi</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Pilih sebuah ikon" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {iconOptions.map(option => {
                                                    const Icon = getIcon(option.value);
                                                    return (
                                                        <SelectItem key={option.value} value={option.value}>
                                                          <div className="flex items-center gap-2">
                                                            <Icon className="h-4 w-4" />
                                                            <span>{option.label}</span>
                                                          </div>
                                                        </SelectItem>
                                                    );
                                                })}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            
                            <FormField
                                control={form.control}
                                name="primaryColor"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Warna Tema</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Pilih warna tema" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {colorOptions.map(option => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-4 w-4 rounded-full" style={{ backgroundColor: `hsl(${option.value})` }} />
                                                            <span>{option.label}</span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            
                            <FormField
                                control={form.control}
                                name="sidebarOpen"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-base">Tampilkan Menu Sidebar</FormLabel>
                                            <CardDescription>
                                               Matikan untuk menyembunyikan menu navigasi di sebelah kiri.
                                            </CardDescription>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            <Button type="submit">Simpan Pengaturan</Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
