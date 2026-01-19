import { useState } from 'react';
import { useCustomTheme, AVAILABLE_FONTS, DEFAULT_THEME } from '../context/ThemeContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Slider } from './ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import {
    Sun,
    Moon,
    Palette,
    Type,
    Image,
    Upload,
    Smartphone,
    Tablet,
    RotateCcw,
    X
} from 'lucide-react';

// Color presets for quick selection
const COLOR_PRESETS = [
    { name: 'Red', value: '#EE4137' },
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Green', value: '#22C55E' },
    { name: 'Purple', value: '#8B5CF6' },
    { name: 'Orange', value: '#F97316' },
    { name: 'Pink', value: '#EC4899' },
    { name: 'Teal', value: '#14B8A6' },
    { name: 'Indigo', value: '#6366F1' },
];

interface MobilePreviewProps {
    deviceType: 'phone' | 'tablet';
}

function MobilePreview({ deviceType }: MobilePreviewProps) {
    const { theme } = useCustomTheme();

    const dimensions = deviceType === 'phone'
        ? { width: 375, height: 667, scale: 0.6 }
        : { width: 768, height: 1024, scale: 0.45 };

    return (
        <div className="flex flex-col items-center gap-4">
            <div
                className="relative bg-slate-900 rounded-[3rem] p-3 shadow-2xl"
                style={{
                    width: dimensions.width * dimensions.scale + 24,
                }}
            >
                {/* Device notch for phone */}
                {deviceType === 'phone' && (
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-6 bg-slate-900 rounded-full z-10" />
                )}

                {/* Screen */}
                <div
                    className="relative overflow-hidden rounded-[2.5rem] bg-white"
                    style={{
                        width: dimensions.width * dimensions.scale,
                        height: dimensions.height * dimensions.scale,
                    }}
                >
                    {/* Preview content with applied theme */}
                    <div
                        className="absolute inset-0 overflow-auto"
                        style={{
                            transform: `scale(${dimensions.scale})`,
                            transformOrigin: 'top left',
                            width: dimensions.width,
                            height: dimensions.height,
                            backgroundColor: theme.mode === 'dark' ? '#1a1a1a' : '#ffffff',
                            color: theme.mode === 'dark' ? '#ffffff' : '#1a1a1a',
                            fontFamily: theme.fontFamily,
                        }}
                    >
                        {/* Background image layer */}
                        {theme.backgroundImage && (
                            <>
                                <div
                                    className="absolute inset-0 bg-cover bg-center"
                                    style={{ backgroundImage: `url(${theme.backgroundImage})` }}
                                />
                                <div
                                    className="absolute inset-0"
                                    style={{
                                        backgroundColor: theme.mode === 'dark' ? '#000' : '#fff',
                                        opacity: theme.backgroundOverlay / 100
                                    }}
                                />
                            </>
                        )}

                        {/* Preview UI */}
                        <div className="relative p-6 space-y-4">
                            {/* Logo preview */}
                            {theme.logoUrl && (
                                <div className="flex justify-center mb-4">
                                    <img
                                        src={theme.logoUrl}
                                        alt="Logo"
                                        className="h-12 object-contain"
                                    />
                                </div>
                            )}

                            <h1 className="text-2xl font-bold text-center">Usability Test</h1>
                            <p className="text-sm text-center opacity-70">
                                Preview of your customized theme
                            </p>

                            {/* Sample button */}
                            <button
                                className="w-full py-3 px-4 rounded-lg text-white font-medium"
                                style={{ backgroundColor: theme.primaryColor }}
                            >
                                Start Test
                            </button>

                            {/* Sample card */}
                            <div
                                className="p-4 rounded-lg border"
                                style={{
                                    backgroundColor: theme.mode === 'dark' ? '#2a2a2a' : '#f5f5f5',
                                    borderColor: theme.mode === 'dark' ? '#404040' : '#e5e5e5'
                                }}
                            >
                                <h3 className="font-medium mb-2">Sample Card</h3>
                                <p className="text-sm opacity-70">
                                    This is how content will appear with your selected theme.
                                </p>
                            </div>

                            {/* Sample link */}
                            <p className="text-center">
                                <a
                                    href="#"
                                    onClick={(e) => e.preventDefault()}
                                    style={{ color: theme.primaryColor }}
                                    className="underline"
                                >
                                    Sample Link
                                </a>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            <p className="text-sm text-muted-foreground capitalize">{deviceType} Preview</p>
        </div>
    );
}

export function ThemeCustomizer() {
    const { theme, updateTheme, resetTheme, isCustomized } = useCustomTheme();
    const [previewDevice, setPreviewDevice] = useState<'phone' | 'tablet'>('phone');
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    // Handle logo upload
    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.match(/^image\/(png|jpeg|jpg|svg\+xml)$/)) {
            alert('Please upload a PNG, JPG, or SVG file');
            return;
        }

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            alert('File size must be less than 2MB');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            updateTheme({ logoUrl: event.target?.result as string });
        };
        reader.readAsDataURL(file);
    };

    // Handle background image upload
    const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.match(/^image\/(png|jpeg|jpg|webp)$/)) {
            alert('Please upload a PNG, JPG, or WebP file');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('File size must be less than 5MB');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            updateTheme({ backgroundImage: event.target?.result as string });
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold">Theme Customization</h2>
                    <p className="text-sm text-muted-foreground">
                        Customize the appearance of your testing environment
                    </p>
                </div>
                <div className="flex gap-2">
                    {/* Mobile Preview Dialog */}
                    <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                                <Smartphone className="w-4 h-4 mr-2" />
                                Preview
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl">
                            <DialogHeader>
                                <DialogTitle>Mobile Preview</DialogTitle>
                                <DialogDescription>
                                    See how your theme looks on different devices
                                </DialogDescription>
                            </DialogHeader>
                            <div className="flex flex-col items-center gap-4 py-4">
                                <div className="flex gap-2">
                                    <Button
                                        variant={previewDevice === 'phone' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setPreviewDevice('phone')}
                                    >
                                        <Smartphone className="w-4 h-4 mr-2" />
                                        Phone
                                    </Button>
                                    <Button
                                        variant={previewDevice === 'tablet' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setPreviewDevice('tablet')}
                                    >
                                        <Tablet className="w-4 h-4 mr-2" />
                                        Tablet
                                    </Button>
                                </div>
                                <MobilePreview deviceType={previewDevice} />
                            </div>
                        </DialogContent>
                    </Dialog>

                    {isCustomized && (
                        <Button variant="outline" size="sm" onClick={resetTheme}>
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Reset
                        </Button>
                    )}
                </div>
            </div>

            <Tabs defaultValue="colors" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="colors" className="flex items-center gap-2">
                        <Palette className="w-4 h-4" />
                        <span className="hidden sm:inline">Colors</span>
                    </TabsTrigger>
                    <TabsTrigger value="typography" className="flex items-center gap-2">
                        <Type className="w-4 h-4" />
                        <span className="hidden sm:inline">Typography</span>
                    </TabsTrigger>
                    <TabsTrigger value="branding" className="flex items-center gap-2">
                        <Upload className="w-4 h-4" />
                        <span className="hidden sm:inline">Branding</span>
                    </TabsTrigger>
                    <TabsTrigger value="background" className="flex items-center gap-2">
                        <Image className="w-4 h-4" />
                        <span className="hidden sm:inline">Background</span>
                    </TabsTrigger>
                </TabsList>

                {/* Colors Tab */}
                <TabsContent value="colors" className="space-y-4 mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Color Mode</CardTitle>
                            <CardDescription>Switch between light and dark themes</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {theme.mode === 'light' ? (
                                        <Sun className="w-5 h-5 text-amber-500" />
                                    ) : (
                                        <Moon className="w-5 h-5 text-blue-400" />
                                    )}
                                    <span className="font-medium capitalize">{theme.mode} Mode</span>
                                </div>
                                <Switch
                                    checked={theme.mode === 'dark'}
                                    onCheckedChange={(checked) => updateTheme({ mode: checked ? 'dark' : 'light' })}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Primary Color</CardTitle>
                            <CardDescription>Used for buttons, links, and focus states</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div
                                    className="w-12 h-12 rounded-lg border-2 border-border shadow-sm"
                                    style={{ backgroundColor: theme.primaryColor }}
                                />
                                <Input
                                    type="color"
                                    value={theme.primaryColor}
                                    onChange={(e) => updateTheme({ primaryColor: e.target.value })}
                                    className="w-20 h-10 p-1 cursor-pointer"
                                />
                                <Input
                                    type="text"
                                    value={theme.primaryColor}
                                    onChange={(e) => updateTheme({ primaryColor: e.target.value })}
                                    className="w-28 font-mono text-sm"
                                    placeholder="#000000"
                                />
                            </div>

                            {/* Color presets */}
                            <div>
                                <Label className="text-sm text-muted-foreground mb-2 block">Quick Presets</Label>
                                <div className="flex flex-wrap gap-2">
                                    {COLOR_PRESETS.map((preset) => (
                                        <button
                                            key={preset.value}
                                            onClick={() => updateTheme({ primaryColor: preset.value })}
                                            className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${theme.primaryColor === preset.value
                                                    ? 'border-foreground ring-2 ring-offset-2 ring-foreground'
                                                    : 'border-border'
                                                }`}
                                            style={{ backgroundColor: preset.value }}
                                            title={preset.name}
                                        />
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Accent Color</CardTitle>
                            <CardDescription>Used for secondary highlights and hover states</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-4">
                                <div
                                    className="w-12 h-12 rounded-lg border-2 border-border shadow-sm"
                                    style={{ backgroundColor: theme.accentColor }}
                                />
                                <Input
                                    type="color"
                                    value={theme.accentColor}
                                    onChange={(e) => updateTheme({ accentColor: e.target.value })}
                                    className="w-20 h-10 p-1 cursor-pointer"
                                />
                                <Input
                                    type="text"
                                    value={theme.accentColor}
                                    onChange={(e) => updateTheme({ accentColor: e.target.value })}
                                    className="w-28 font-mono text-sm"
                                    placeholder="#000000"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Typography Tab */}
                <TabsContent value="typography" className="space-y-4 mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Font Family</CardTitle>
                            <CardDescription>Choose a font for your testing environment</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Select
                                value={theme.fontFamily}
                                onValueChange={(value) => updateTheme({ fontFamily: value })}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select a font" />
                                </SelectTrigger>
                                <SelectContent>
                                    {AVAILABLE_FONTS.map((font) => (
                                        <SelectItem
                                            key={font.value}
                                            value={font.value}
                                            style={{ fontFamily: font.value }}
                                        >
                                            {font.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Font preview */}
                            <div
                                className="p-4 rounded-lg border bg-muted/50"
                                style={{ fontFamily: theme.fontFamily }}
                            >
                                <p className="text-lg font-semibold mb-2">Font Preview</p>
                                <p className="text-sm">
                                    The quick brown fox jumps over the lazy dog.
                                    0123456789 !@#$%^&*()
                                </p>
                                <p className="text-sm mt-2">
                                    <strong>Bold text</strong> and <em>italic text</em> samples.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Branding Tab */}
                <TabsContent value="branding" className="space-y-4 mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Logo</CardTitle>
                            <CardDescription>Upload your logo to brand the testing environment</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {theme.logoUrl ? (
                                <div className="relative inline-block">
                                    <div className="p-4 border rounded-lg bg-muted/50">
                                        <img
                                            src={theme.logoUrl}
                                            alt="Uploaded logo"
                                            className="max-h-20 object-contain"
                                        />
                                    </div>
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        className="absolute -top-2 -right-2 w-6 h-6"
                                        onClick={() => updateTheme({ logoUrl: null })}
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                                    <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                                    <p className="text-sm text-muted-foreground mb-2">
                                        PNG, JPG, or SVG (max 2MB)
                                    </p>
                                    <label htmlFor="logo-upload">
                                        <Button variant="outline" asChild>
                                            <span>Choose File</span>
                                        </Button>
                                    </label>
                                    <input
                                        id="logo-upload"
                                        type="file"
                                        accept=".png,.jpg,.jpeg,.svg"
                                        onChange={handleLogoUpload}
                                        className="hidden"
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Background Tab */}
                <TabsContent value="background" className="space-y-4 mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Background Image</CardTitle>
                            <CardDescription>Add a custom background image</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {theme.backgroundImage ? (
                                <div className="space-y-4">
                                    <div className="relative inline-block w-full">
                                        <div
                                            className="w-full h-40 rounded-lg bg-cover bg-center border"
                                            style={{ backgroundImage: `url(${theme.backgroundImage})` }}
                                        />
                                        <Button
                                            variant="destructive"
                                            size="icon"
                                            className="absolute top-2 right-2 w-6 h-6"
                                            onClick={() => updateTheme({ backgroundImage: null })}
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>

                                    <div>
                                        <Label className="text-sm">Overlay Opacity: {theme.backgroundOverlay}%</Label>
                                        <Slider
                                            value={[theme.backgroundOverlay]}
                                            onValueChange={([value]) => updateTheme({ backgroundOverlay: value })}
                                            min={0}
                                            max={100}
                                            step={5}
                                            className="mt-2"
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Adjust the overlay to ensure text remains readable
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                                    <Image className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                                    <p className="text-sm text-muted-foreground mb-2">
                                        PNG, JPG, or WebP (max 5MB)
                                    </p>
                                    <label htmlFor="bg-upload">
                                        <Button variant="outline" asChild>
                                            <span>Choose File</span>
                                        </Button>
                                    </label>
                                    <input
                                        id="bg-upload"
                                        type="file"
                                        accept=".png,.jpg,.jpeg,.webp"
                                        onChange={handleBackgroundUpload}
                                        className="hidden"
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
