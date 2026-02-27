"use client";

import { Search, Plus, User, LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { QuickAddMenu } from "./quick-add-menu";
import { logout } from "@/lib/actions/auth";
import { useState } from "react";

export function TopBar() {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b bg-background">
      <div className="flex h-14 items-center gap-2 px-4">
        <h1 className="text-lg font-bold whitespace-nowrap">TCG Manager</h1>

        <div className="flex-1" />

        {searchOpen ? (
          <div className="flex-1 max-w-xs">
            <Input
              placeholder="Search inventory..."
              className="h-8"
              autoFocus
              onBlur={() => setSearchOpen(false)}
            />
          </div>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="h-4 w-4" />
          </Button>
        )}

        <QuickAddMenu>
          <Button variant="default" size="icon" className="h-8 w-8">
            <Plus className="h-4 w-4" />
          </Button>
        </QuickAddMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <User className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                logout();
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
