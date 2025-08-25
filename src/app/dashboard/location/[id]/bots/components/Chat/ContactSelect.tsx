"use client";

import React from "react";
import { useChatContext } from "./AIChatProvider";
import { MOCK_UNIFIED_CONTACTS } from "@/mocks/bots";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { User, Users } from "lucide-react";

export function ContactSelect() {
  const { selectedContact, setSelectedContact } = useChatContext();

  const getContactIcon = (type: string) => {
    switch (type) {
      case "member":
        return <Users size={14} className="text-green-600" />;
      case "guest":
        return <User size={14} className="text-blue-600" />;
      default:
        return <User size={14} className="text-muted-foreground" />;
    }
  };

  const getContactBadgeColor = (type: string) => {
    switch (type) {
      case "member":
        return "bg-green-100 text-green-800 border-green-200";
      case "guest":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div>
      <label className="text-sm font-medium mb-2 block">Test as Contact</label>
      <Select
        value={selectedContact?.id || ""}
        onValueChange={(value) => {
          const contact = MOCK_UNIFIED_CONTACTS.find((c) => c.id === value);
          setSelectedContact(contact || null);
        }}
      >
        <SelectTrigger className="dark:border-foreground/40">
          <SelectValue placeholder="Choose a contact to test as">
            {selectedContact && (
              <div className="flex items-center gap-2">
                {getContactIcon(selectedContact.type)}
                <span>
                  {selectedContact.firstName} {selectedContact.lastName}
                </span>
                <Badge
                  variant="secondary"
                  className={`text-xs ${getContactBadgeColor(
                    selectedContact.type
                  )}`}
                >
                  {selectedContact.type}
                </Badge>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {MOCK_UNIFIED_CONTACTS.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <User size={24} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No contacts available</p>
            </div>
          ) : (
            <>
              {/* Group members */}
              {MOCK_UNIFIED_CONTACTS.filter((c) => c.type === "member").length >
                0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground bg-muted/50">
                    Members
                  </div>
                  {MOCK_UNIFIED_CONTACTS.filter(
                    (contact) => contact.type === "member"
                  ).map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      <div className="flex items-center gap-2">
                        {getContactIcon(contact.type)}
                        <span>
                          {contact.firstName} {contact.lastName}
                        </span>
                        <Badge
                          variant="secondary"
                          className={`text-xs ${getContactBadgeColor(
                            contact.type
                          )}`}
                        >
                          {contact.type}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </>
              )}

              {/* Group guests */}
              {MOCK_UNIFIED_CONTACTS.filter((c) => c.type === "guest").length >
                0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground bg-muted/50">
                    Guests
                  </div>
                  {MOCK_UNIFIED_CONTACTS.filter(
                    (contact) => contact.type === "guest"
                  ).map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      <div className="flex items-center gap-2">
                        {getContactIcon(contact.type)}
                        <span>
                          {contact.firstName} {contact.lastName}
                        </span>
                        <Badge
                          variant="secondary"
                          className={`text-xs ${getContactBadgeColor(
                            contact.type
                          )}`}
                        >
                          {contact.type}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </>
              )}
            </>
          )}
        </SelectContent>
      </Select>

      {selectedContact && (
        <div className="mt-2 text-xs text-muted-foreground">
          <p>Email: {selectedContact.email}</p>
          {selectedContact.phone && <p>Phone: {selectedContact.phone}</p>}
          {selectedContact.botMetadata &&
            Object.keys(selectedContact.botMetadata).length > 0 && (
              <details className="mt-1">
                <summary className="cursor-pointer">Bot Metadata</summary>
                <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto">
                  {JSON.stringify(selectedContact.botMetadata, null, 2)}
                </pre>
              </details>
            )}
        </div>
      )}
    </div>
  );
}
