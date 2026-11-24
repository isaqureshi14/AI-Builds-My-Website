export interface User {
    id: number;
    name: string;
    email: string;
    email_verified_at?: string;
}

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    auth: {
        user: User;
    };
    hasGeminiEnv?: boolean;
};

export interface ThemeSettings {
    palette?: string;
    font_heading?: string;
    font_body?: string;
    style?: string;
    border_radius?: string;
}

export interface SectionItem {
    id?: string;
    title?: string;
    name?: string;
    description?: string;
    price?: string;
    period?: string;
    features?: string[];
    popular?: boolean;
    quote?: string;
    author?: string;
    role?: string;
    company?: string;
    avatar?: string;
    rating?: number;
    question?: string;
    answer?: string;
    icon?: string;
}

export interface SectionContent {
    headline?: string;
    subheadline?: string;
    primary_cta?: string;
    primary_cta_link?: string;
    secondary_cta?: string;
    secondary_cta_link?: string;
    badge?: string;
    story?: string;
    mission?: string;
    bullets?: string[];
    services?: SectionItem[];
    plans?: SectionItem[];
    testimonials?: SectionItem[];
    items?: SectionItem[];
    email?: string;
    phone?: string;
    address?: string;
    hours?: string;
    form_enabled?: boolean;
    copyright?: string;
    links?: { label: string; href: string }[];
    socials?: { platform: string; url: string }[];
    [key: string]: any;
}

export interface Section {
    id: number;
    website_id: number;
    type: 'hero' | 'about' | 'services' | 'products' | 'pricing' | 'gallery' | 'testimonials' | 'contact' | 'faq' | 'footer' | string;
    title: string | null;
    subtitle: string | null;
    content: SectionContent;
    order: number;
    is_visible: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface Fact {
    id: number;
    website_id: number;
    source_type: string;
    source_name: string;
    field_name: string;
    field_value: string;
    confidence: number;
    is_confirmed: boolean;
    has_conflict: boolean;
    conflict_details?: any;
}

export interface ConflictItem {
    field_name: string;
    fact_ids: number[];
    values: {
        id: number;
        source_type: string;
        source_name: string;
        field_value: string;
        confidence: number;
    }[];
}

export interface UploadedSource {
    id: number;
    original_name: string;
    mime_type: string;
    file_size: number;
    sanitization_status: string;
    flags: {
        flag?: string;
        details?: string;
        blocked?: boolean;
    }[];
}

export interface Website {
    id: number;
    user_id?: number | null;
    business_name: string;
    city: string | null;
    tagline: string | null;
    title: string;
    slug: string;
    status: 'draft' | 'published';
    theme_settings: ThemeSettings;
    published_at: string | null;
    created_at?: string;
    updated_at?: string;
    sections?: Section[];
    facts?: Fact[];
}
